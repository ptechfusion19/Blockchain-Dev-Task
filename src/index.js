#!/usr/bin/env node
// src/index.js
/**
 * Main CLI — complete file (chalk + ora import compatibility fixes)
 *
 * - Interactive chooser for sell/buy token & amount
 * - Calls 0x /swap/permit2/price and /quote
 * - Signs Permit2 EIP-712 messages (if provided)
 * - Simulates transaction via eth_call
 * - Optionally broadcasts transaction
 *
 * This file uses safe imports for ora and chalk so it works with both CJS & ESM-first packages.
 */

const inquirer = require('inquirer');
const ethers = require('ethers');

// ----- Safe chalk import (CJS/ESM interop) -----
let chalkImport;
try {
  chalkImport = require('chalk');
} catch (e) {
  chalkImport = null;
}
const chalk = (
  chalkImport && typeof chalkImport === 'function' ? chalkImport
  : chalkImport && chalkImport.default && typeof chalkImport.default === 'function' ? chalkImport.default
  : chalkImport && typeof chalkImport.red === 'function' ? chalkImport
  : chalkImport && chalkImport.default && typeof chalkImport.default.red === 'function' ? chalkImport.default
  : {
      // fallback: no coloring
      red: (s) => String(s),
      green: (s) => String(s),
      yellow: (s) => String(s),
      blue: (s) => String(s),
      gray: (s) => String(s),
    }
);

// ----- Safe ora import (CJS/ESM interop) -----
let oraImport;
try {
  oraImport = require('ora');
} catch (e) {
  oraImport = null;
}
const ora = (typeof oraImport === 'function') ? oraImport : (oraImport && oraImport.default) ? oraImport.default : null;
if (!ora) {
  console.warn(chalk.yellow('Warning: ora spinner could not be loaded. CLI will still work but without spinners.'));
}

// local modules
const { TOKENS, ETH_TOKEN } = require('./tokens');
const { getPrice, getQuote, get0xBaseUrl } = require('./0xClient');
const { signPermit2TypedData, appendSignatureToCalldata } = require('./permit2');
const { toWei } = require('./utils');
const config = require('./config');

const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);
const wallet = new ethers.Wallet(config.PRIVATE_KEY || ethers.constants.HashZero, provider);
const signer = wallet.connect(provider);
const walletAddress = "0xCBc444c98CD48baAa9a975AA6660899C52961Cb0";

async function main() {
  console.log(chalk.green('\n0x Swap (Permit2) — Terminal Client\n'));
  console.log(chalk.gray(`Network chainId: ${config.CHAIN_ID}. RPC: ${config.RPC_URL}`));
  try {
    console.log(chalk.gray(`Using 0x base URL: ${get0xBaseUrl(config.CHAIN_ID)}\n`));
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  // Build token choices (ETH + TOKENS map). TOKENS should be defined in src/tokens.js
  const tokenChoices = Object.keys(TOKENS).map(k => ({ name: `${k} — ${TOKENS[k].address}`, value: k }));
  tokenChoices.unshift({ name: 'ETH (native)', value: 'ETH' });

  const answers = await inquirer.prompt([
    { type: 'list', name: 'sell', message: 'Select sell token:', choices: tokenChoices },
    { type: 'list', name: 'buy', message: 'Select buy token:', choices: tokenChoices.filter(c => c.value !== undefined) },
    { type: 'input', name: 'amount', message: 'Sell amount (human readable, e.g. 0.1):', validate: s => !!s && !isNaN(Number(s)) },
    { type: 'confirm', name: 'simulateOnly', message: 'Simulate only? (Do not broadcast)', default: true },
  ]);

  const sellTokenInfo = answers.sell === 'ETH' ? { address: ETH_TOKEN, decimals: 18, symbol: 'ETH' } : TOKENS[answers.sell];
  const buyTokenInfo  = answers.buy === 'ETH' ? { address: ETH_TOKEN, decimals: 18, symbol: 'ETH' } : TOKENS[answers.buy];
  const sellAmountBase = toWei(answers.amount, sellTokenInfo.decimals);

  // Use spinner if available
  const spinner = ora ? ora('Fetching price...').start() : { succeed: () => {}, fail: () => {}, stop: () => {} };

  try {
    const priceResp = await getPrice({
      chainId: config.CHAIN_ID,
      sellToken: sellTokenInfo.address,
      buyToken: buyTokenInfo.address,
      sellAmount: sellAmountBase,
      taker: walletAddress
    });
    spinner.succeed('Price fetched');

    console.log(chalk.yellow('\nIndicative Price response:'));
    console.log(JSON.stringify({
      buyAmount: priceResp.buyAmount,
      estimatedGas: priceResp.estimatedGas || priceResp.gas,
      liquidityAvailable: priceResp.liquidityAvailable,
      issues: priceResp.issues || null
    }, null, 2));

    // If no liquidity available, warn and ask whether to force a quote
    if (!priceResp.liquidityAvailable) {
      console.log(chalk.red('\nNote: 0x reports NO LIQUIDITY for this pair/amount on the selected chain.'));
      const { force } = await inquirer.prompt([{ type: 'confirm', name: 'force', message: 'Force request a quote anyway?', default: false }]);
      if (!force) {
        console.log(chalk.green('Exiting — try a different pair or amount.'));
        process.exit(0);
      }
    }

    const { fetchQuote } = await inquirer.prompt([{ type: 'confirm', name: 'fetchQuote', message: 'Fetch firm quote (permit2) and continue?', default: true }]);
    if (!fetchQuote) {
      console.log(chalk.green('Exiting — you chose not to fetch a quote.'));
      process.exit(0);
    }

    const qSpinner = ora ? ora('Requesting firm quote...').start() : { succeed: () => {}, fail: () => {} };
    const quote = await getQuote({
      chainId: config.CHAIN_ID,
      sellToken: sellTokenInfo.address,
      buyToken: buyTokenInfo.address,
      sellAmount: sellAmountBase,
      taker: walletAddress
    });
    qSpinner.succeed('Quote retrieved');

    // Guard against missing transaction (happens when liquidity insufficient or 0x rejects)
    if (!quote || !quote.transaction) {
      console.error(chalk.red('\nQuote did not include a transaction payload. Likely not executable.'));
      console.error(chalk.gray('Full quote response:'), JSON.stringify(quote, null, 2));
      process.exit(1);
    }

    console.log(chalk.yellow('\nQuote summary:'));
    console.log({
      buyAmount: quote.buyAmount,
      gas: quote.estimatedGas || quote.gas,
      to: quote.transaction.to,
      value: quote.transaction.value,
      allowanceTarget: quote.allowanceTarget || (quote.issues && quote.issues.allowance && quote.issues.allowance.spender) || null,
      permitPresent: !!(quote.permit2 && quote.permit2.eip712)
    });

    // Sign Permit2 EIP-712 payload if present and append signature to calldata
    let finalCalldata = quote.transaction.data;
    if (quote.permit2 && quote.permit2.eip712) {
      console.log(chalk.blue('\nPermit2 EIP-712 payload found. Signing with local private key...'));
      try {
        const signature = await signPermit2TypedData(signer, quote.permit2.eip712);
        finalCalldata = appendSignatureToCalldata(quote.transaction.data, signature);
        console.log(chalk.green('Permit2 signature appended to calldata.'));
      } catch (err) {
        console.error(chalk.red('Failed to sign Permit2 typed data:'), err.message);
        console.log(chalk.yellow('Continuing — note that without a valid permit signature the transaction may revert.'));
      }
    } else {
      console.log(chalk.blue('No Permit2 typed-data present. 0x may expect a prior allowance or AllowanceHolder flow.'));
    }

    // Build tx object for simulation / estimation / sending
    const tx = {
      to: quote.transaction.to,
      data: finalCalldata,
      value: quote.transaction.value ? ethers.BigNumber.from(quote.transaction.value) : ethers.BigNumber.from(0),
      from: walletAddress
    };

    // Simulate via eth_call
    console.log(chalk.blue('\nSimulating transaction using eth_call (provider.call)...'));
    try {
      const callResult = await provider.call(tx);
      console.log(chalk.green('Simulation successful. eth_call returned (hex):'));
      console.log(callResult);
    } catch (callErr) {
      console.error(chalk.red('Simulation (eth_call) reverted or failed:'), callErr.message);
      // still attempt gas estimate to give user more info
    }

    // Gas estimate and cost breakdown
    try {
      const gasEstimate = await provider.estimateGas(tx);
      const feeData = await provider.getFeeData();
      const gasPriceUsed = feeData.gasPrice || feeData.maxFeePerGas || feeData.maxPriorityFeePerGas;
      console.log(chalk.yellow('\nGas estimate & cost (approx):'));
      console.log(`Gas estimate: ${gasEstimate.toString()}`);
      if (gasPriceUsed) {
        const costWei = gasEstimate.mul(gasPriceUsed);
        console.log(`Approx cost (wei): ${costWei.toString()}`);
        console.log(`Approx cost (ETH): ${ethers.utils.formatEther(costWei)}`);
      } else {
        console.log('Gas price data unavailable from provider.');
      }
    } catch (gasErr) {
      console.error(chalk.red('Gas estimate failed:'), gasErr.message);
    }

    // Show sources / route if present
    if (quote.sources) {
      console.log(chalk.yellow('\nLiquidity sources (quote.sources):'));
      console.log(quote.sources);
    } else if (quote.route) {
      console.log(chalk.yellow('\nRoute info:'));
      console.log(JSON.stringify(quote.route, null, 2));
    }

    // If user chose simulation-only, exit now
    if (answers.simulateOnly) {
      console.log(chalk.green('\nSIMULATION MODE: not broadcasting transaction.'));
      process.exit(0);
    }

    // Ask user to confirm broadcast
    const { confirmSend } = await inquirer.prompt([{ type: 'confirm', name: 'confirmSend', message: 'Send transaction now?', default: false }]);
    if (!confirmSend) {
      console.log(chalk.green('Not sending. Re-run with simulateOnly = false to attempt send.'));
      process.exit(0);
    }

    // Attempt to send
    console.log(chalk.blue('Broadcasting transaction...'));
    try {
      const sendTx = { to: quote.transaction.to, data: finalCalldata, value: tx.value };
      const sent = await signer.sendTransaction(sendTx);
      console.log(chalk.green('Transaction sent. Hash:'), sent.hash);
      console.log(chalk.gray('Waiting for 1 confirmation...'));
      const receipt = await sent.wait(1);
      console.log(chalk.green('Transaction mined! Receipt:'));
      console.log(receipt);
    } catch (sendErr) {
      console.error(chalk.red('Transaction send failed:'), sendErr.message);
      console.log(chalk.yellow('Attempting to re-simulate the tx (safety)...'));
      try {
        const callResult2 = await provider.call(tx);
        console.log(chalk.green('Simulation succeeded. eth_call returned (hex):'));
        console.log(callResult2);
      } catch (e2) {
        console.error(chalk.red('Simulation also failed:'), e2.message);
      }
    }

  } catch (err) {
    if (spinner && spinner.fail) spinner.fail('Error during flow');
    console.error(chalk.red(err.message || String(err)));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(chalk.red('Fatal error:'), e && e.message ? e.message : String(e));
  process.exit(1);
});
