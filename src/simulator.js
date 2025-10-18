// src/simulator.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const rubic = require('./rubicClient');
const { getProviderForChain } = require('./utils');

// Robust chalk import
let chalk;
try {
  const chalkModule = require('chalk');
  chalk = chalkModule.default ? chalkModule.default : chalkModule;
} catch (e) {
  chalk = {
    blue: (s) => s,
    green: (s) => s,
    yellow: (s) => s,
    red: (s) => s,
    magenta: (s) => s,
    cyan: (s) => s,
    gray: (s) => s
  };
}

/**
 * File logger for verbose runs. Appends JSON/plain text to a file (ANSI stripped).
 */
function makeFileLogger(logPath) {
  if (!logPath) return null;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const fd = fs.openSync(logPath, 'a');

  const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

  function write(obj) {
    let line;
    if (typeof obj === 'string') {
      line = obj;
    } else {
      try {
        line = JSON.stringify(obj, null, 2);
      } catch (e) {
        line = String(obj);
      }
    }
    try {
      fs.writeSync(fd, stripAnsi(line) + '\n');
    } catch (e) {
      // ignore file write errors
      console.error('Failed writing to log file:', e.message);
    }
  }

  return {
    write,
    close: () => {
      try { fs.closeSync(fd); } catch (e) {}
    }
  };
}

/**
 * Scoring function to choose best route.
 * Prefer destinationUsdAmount, else destination token amount, else negative priceImpact.
 */
function scoreRoute(route) {
  const est = route.estimate || route.quote || route;
  if (!est) return -Infinity;
  const usd =
    est.destinationUsdAmount ??
    est.destinationUsd ??
    est.destinationUsdAmountInUsd ??
    est.destinationUsdAmountUsd ??
    null;
  if (usd !== undefined && usd !== null && !isNaN(parseFloat(usd))) {
    return parseFloat(usd);
  }
  const dest =
    est.destinationTokenAmount ??
    est.destinationAmount ??
    est.destinationWeiAmount ??
    est.destinationAmountToken ??
    null;
  if (dest !== undefined && dest !== null && !isNaN(parseFloat(dest))) {
    return parseFloat(dest);
  }
  const pi = est.priceImpact ?? est.price_impact ?? null;
  if (pi !== undefined && pi !== null && !isNaN(parseFloat(pi))) {
    return -parseFloat(pi);
  }
  return 0;
}

/**
 * simulateSwap(params, options)
 * params: as before
 * options:
 *   verbose: boolean — if true will write detailed JSON to logPath (if provided)
 *   logPath: string|null — where to save raw responses (created if verbose true)
 *   bestOnly: boolean — if true select single best route and only print that route to terminal
 *   showRaw: boolean — older option kept
 */
async function simulateSwap(params, { showRaw = false, verbose = false, logPath = null, bestOnly = false } = {}) {
  const fileLogger = verbose && logPath ? makeFileLogger(logPath) : null;

  // ensure fromAddress
  if (!params.fromAddress) {
    try {
      const wallet = ethers.Wallet.createRandom();
      params.fromAddress = wallet.address;
      console.log(chalk.yellow(`Note: no fromAddress provided — using generated address ${params.fromAddress} for Rubic API calls.`));
      if (fileLogger) fileLogger.write({ note: `generated fromAddress ${params.fromAddress}` });
    } catch (e) {
      params.fromAddress = '0x1111111111111111111111111111111111111111';
      console.log(chalk.yellow(`Note: fallback fromAddress ${params.fromAddress}`));
      if (fileLogger) fileLogger.write({ note: `fallback fromAddress ${params.fromAddress}` });
    }
  }

  console.log(chalk.blue('→ Requesting routes from Rubic (quoteAll) ...'));
  let quotesResp;
  try {
    quotesResp = await rubic.quoteAll(params);
  } catch (err) {
    const apiData = err.payload?.data ?? err.response?.data ?? null;
    console.error(chalk.red('Failed to fetch quotes from Rubic:'));
    if (apiData?.errors) {
      console.error(JSON.stringify(apiData.errors, null, 2));
      if (fileLogger) fileLogger.write({ quoteAll_error: apiData.errors });
    } else {
      console.error(err.payload ?? err.response?.data ?? err.message ?? err);
      if (fileLogger) fileLogger.write({ quoteAll_error: err.payload ?? err.response?.data ?? err.message ?? String(err) });
    }
    throw err;
  }

  // Write full quoteAll to file only (if verbose). On bestOnly we do NOT dump it to terminal.
  if (fileLogger) {
    fileLogger.write({ quoteAll: quotesResp });
    console.log(chalk.gray(`Detailed quoteAll response saved to ${logPath}`));
  } else if (!bestOnly) {
    // If not bestOnly and no fileLogger, it's okay to show a small message; avoid large dumps to terminal.
    console.log(chalk.gray('quoteAll returned — proceeding to analyze routes.'));
  }

  // normalize routes
  const routes = Array.isArray(quotesResp) ? quotesResp : (quotesResp.routes || quotesResp.routing || [quotesResp]);
  if (!routes || !routes.length) {
    console.log(chalk.yellow('No routes returned by Rubic.'));
    if (fileLogger) fileLogger.close();
    return { routes: [] };
  }

  // select best index using the quote-level info
  let selectedIndex = 0;
  if (routes.length > 1) {
    let bestScore = -Infinity;
    for (let i = 0; i < routes.length; i++) {
      const score = scoreRoute(routes[i]);
      if (score > bestScore) {
        bestScore = score;
        selectedIndex = i;
      }
    }
  }

  // Inform user which route selected (compact)
  console.log(chalk.green(`Found ${routes.length} routes.`));
  console.log(chalk.magenta(`Selected best route #${selectedIndex + 1} (${routes[selectedIndex].provider || 'unknown'})`));
  if (fileLogger) fileLogger.write({ selectedIndex, selectedRouteSummary: routes[selectedIndex] });

  // We'll gather results but avoid printing non-selected routes to terminal when bestOnly is true.
  const results = [];

  // Request swap for each route — but only print full details of selected route to terminal.
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const routeId = route.id || route.quoteId || (route.quote && route.quote.id) || null;
    const routeSummary = {
      id: routeId,
      provider: route.provider || route.providerType || route.routing?.[0]?.provider || 'unknown',
      type: route.type || route.swapType || (route.routing && route.routing.length ? route.routing[0].type : 'unknown'),
      estimate: route.estimate || route.quote || route,
      fees: route.fees || route.feesDto || null,
      routing: route.routing || route.path || null,
      originalIndex: i
    };

    // build swap body
    const swapBody = {
      srcTokenAddress: params.srcTokenAddress,
      dstTokenAddress: params.dstTokenAddress,
      srcTokenBlockchain: params.srcTokenBlockchain,
      dstTokenBlockchain: params.dstTokenBlockchain,
      srcTokenAmount: params.srcTokenAmount,
      slippage: params.slippage,
      id: routeId,
      fromAddress: params.fromAddress
    };
    if (params.referrer) swapBody.referrer = params.referrer;
    Object.keys(swapBody).forEach(k => swapBody[k] === undefined && delete swapBody[k]);

    // call requestSwap
    let swapData;
    try {
      swapData = await rubic.requestSwap(swapBody);
    } catch (err) {
      const apiData = err.payload?.data ?? err.response?.data ?? null;
      routeSummary.requestError = apiData ?? (err.payload ?? err.message);
      // Save full error to file if verbose
      if (fileLogger) fileLogger.write({ route: i + 1, requestSwapError: routeSummary.requestError });
      // If this is the selected route, we must inform user
      if (i === selectedIndex) {
        console.log(chalk.red(`Selected route #${i + 1} request-swap failed:`));
        console.log(JSON.stringify(routeSummary.requestError, null, 2));
      } else {
        // Non-selected route: keep quiet on terminal
      }
      results.push(routeSummary);
      continue;
    }

    // save swapData to file (for record) if verbose
    if (fileLogger) fileLogger.write({ route: i + 1, swapData });

    const txObj = swapData.transaction || (swapData.transactions && swapData.transactions[0]) || null;
    routeSummary.swapData = swapData;
    routeSummary.transaction = txObj;

    // simulate: estimateGas + call
    if (txObj && txObj.to) {
      const chainCode = params.srcTokenBlockchain || (route.quote && route.quote.srcTokenBlockchain) || 'ETH';
      try {
        const provider = getProviderForChain(chainCode);

        const txForEstimate = {
          to: txObj.to,
          data: txObj.data || '0x',
          value: txObj.value ? txObj.value : 0
        };
        if (params.fromAddress && params.fromAddress !== '0x0000000000000000000000000000000000000000') {
          txForEstimate.from = params.fromAddress;
        }

        // fee data
        const feeData = await provider.getFeeData();
        routeSummary.gasFeeData = {
          gasPrice: feeData.gasPrice ? feeData.gasPrice.toString() : undefined,
          maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas.toString() : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toString() : undefined
        };

        // estimateGas
        try {
          const gasEstimateBn = await provider.estimateGas(txForEstimate);
          routeSummary.estimateGas = gasEstimateBn.toString();
          const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('10', 'gwei');
          const nativeCost = (BigInt(gasEstimateBn.toString()) * BigInt(gasPrice ? gasPrice.toString() : '0')).toString();
          routeSummary.estimateNativeGasCost = ethers.formatUnits(nativeCost, 18);
          routeSummary.simulationCall = { status: 'ESTIMATE_OK', message: 'estimateGas succeeded' };
        } catch (gasErr) {
          const reason = gasErr.reason || gasErr.error?.message || gasErr.message || String(gasErr);
          routeSummary.estimateGas = null;
          routeSummary.simulationCall = { status: 'ESTIMATE_REVERT', message: reason };
        }

        // provider.call
        try {
          const callResult = await provider.call(txForEstimate);
          routeSummary.callResult = callResult;
          routeSummary.simulationCall = { ...(routeSummary.simulationCall || {}), callStatus: 'CALL_OK' };
        } catch (callErr) {
          const callReason = callErr.error?.message || callErr.reason || callErr.message || String(callErr);
          routeSummary.callResult = null;
          routeSummary.simulationCall = { ...(routeSummary.simulationCall || {}), callStatus: 'CALL_REVERT', callMessage: callReason };
        }
      } catch (provErr) {
        routeSummary.simulationCall = { status: 'NO_RPC', message: `No RPC configured for chain or provider error: ${provErr.message}` };
      }
    } else {
      routeSummary.simulationCall = { status: 'NO_TX', message: 'No transaction object available for simulation' };
    }

    // save simulation results for the route into file if verbose
    if (fileLogger) fileLogger.write({ route: i + 1, routeSummary });

    // If this is the selected route, print a compact summary + full simulation details to terminal
    if (i === selectedIndex) {
      // Print compact route summary to terminal
      teePrintSelectedRouteToTerminal(routeSummary, params);

      // Also print deeper simulation results for selected route
      printSimulationDetailsToTerminal(routeSummary, verbose);

      // Still write those outputs into the log file (already done above)
    } else {
      // Non-selected: do not print verbose details to terminal.
      // Optionally print a one-line note to terminal if verbose to indicate saved to log
      if (verbose && fileLogger) {
        console.log(chalk.gray(`Route #${i + 1} details saved to log.`));
      }
    }

    results.push(routeSummary);

    // if bestOnly true we still processed all routes but we printed only selected route.
    // continue to next route to collect logs for file.
  } // end for routes

  if (fileLogger) fileLogger.close();

  // If bestOnly and selected route had no swap data or failed, warn user (we already printed selected's error earlier).
  return { routes: results, selectedIndex };
}

/**
 * Print compact summary (best route) to terminal.
 */
function teePrintSelectedRouteToTerminal(routeSummary, params) {
  console.log(chalk.magenta('\n===== Selected Route Summary (printed to terminal) ====='));
  console.log(`From: ${params.srcTokenAmount} ${params.srcTokenBlockchain}${params.fromAddress ? ` (${params.fromAddress})` : ''}`);
  console.log(`To chain: ${params.dstTokenBlockchain} (${params.dstTokenAddress})`);
  console.log('--------------------------------');
  console.log(chalk.cyan(`Provider: ${routeSummary.provider} — Type: ${routeSummary.type}`));
  const est = routeSummary.estimate;
  if (est) {
    const dest = est.destinationTokenAmount ?? est.destinationWeiAmount ?? est.destinationAmount;
    const min = est.destinationTokenMinAmount ?? est.destinationWeiMinAmount ?? est.destinationMinimumAmount;
    if (dest !== undefined) console.log(`  Expected destination amount: ${dest}`);
    if (min !== undefined) console.log(`  Minimum (after slippage): ${min}`);
    if (est.destinationUsdAmount) console.log(`  Destination USD (est): $${est.destinationUsdAmount}`);
    if (est.priceImpact !== undefined) console.log(`  Price impact: ${est.priceImpact}%`);
    if (est.slippage !== undefined) console.log(`  Slippage configured: ${est.slippage}`);
  }
  if (routeSummary.fees) {
    const g = routeSummary.fees.gasTokenFees;
    if (g) {
      console.log(`  Fees (Rubic): protocol fixed=${g.protocol?.fixedAmount ?? 0} provider fixed=${g.provider?.fixedAmount ?? 0}`);
      if (g.gas) console.log(`    Gas estimate: gasLimit=${g.gas.gasLimit} totalUsd=${g.gas.totalUsdAmount}`);
    }
  }
  console.log('--------------------------------\n');
}

/**
 * Print simulation details for the selected route (estimateGas + call result)
 */
function printSimulationDetailsToTerminal(routeSummary, verbose = false) {
  console.log(chalk.green('--- Simulation result for selected route ---'));
  if (routeSummary.transaction) {
    console.log(`Transaction target: ${routeSummary.transaction.to}`);
    console.log(`Transaction value: ${routeSummary.transaction.value ?? 0}`);
    console.log(`Transaction data: ${String(routeSummary.transaction.data ?? '').slice(0, 160)}...`);
  }
  if (routeSummary.simulationCall) {
    const s = routeSummary.simulationCall;
    if (s.status === 'ESTIMATE_OK') {
      console.log(chalk.green(`estimateGas: OK — gas estimate: ${routeSummary.estimateGas ?? 'n/a'}`));
      console.log(`Estimated native gas cost (approx): ${routeSummary.estimateNativeGasCost ?? 'n/a'}`);
    } else if (s.status === 'ESTIMATE_REVERT') {
      console.log(chalk.red(`estimateGas: REVERT/POTENTIAL FAIL — reason: ${s.message}`));
    } else {
      console.log(`Simulation status: ${JSON.stringify(s)}`);
    }

    if (s.callStatus === 'CALL_OK') {
      console.log(chalk.green(`provider.call: returned hex (call succeeded)`));
      if (routeSummary.callResult) {
        if (verbose) {
          console.log(chalk.gray(`callResult (hex): ${routeSummary.callResult}`));
        } else {
          console.log(chalk.gray(`callResult: (hex present) — run with --verbose to see raw hex`));
        }
      }
    } else if (s.callStatus === 'CALL_REVERT') {
      console.log(chalk.red(`provider.call: REVERT or error — ${s.callMessage}`));
    }
  } else {
    console.log(chalk.yellow('No simulation info available for selected route.'));
  }
  console.log('--------------------------------\n');
}

module.exports = {
  simulateSwap
};
