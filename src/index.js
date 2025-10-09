#!/usr/bin/env node
// src/index.js
/**
 * Main CLI:
 * - lets user pick sell/buy tokens
 * - amount input
 * - calls 0x price and quote endpoints
 * - if permit2 present: sign typed data and append signature
 * - simulate using provider.call (eth_call)
 * - optionally send transaction
 *
 * Notes:
 * - This script uses ethers v5 provider and signer.
 * - If the network or quote fails to send, we fallback to simulation-only behavior.
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const ethers = require('ethers');

const { TOKENS, ETH_TOKEN } = require('./tokens');
const { getPrice, getQuote } = require('./0xClient');
const { signPermit2TypedData, appendSignatureToCalldata } = require('./permit2');
const { toWei, fromWei } = require('./utils');
const config = require('./config');

const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);
const wallet = new ethers.Wallet(config.PRIVATE_KEY || ethers.constants.HashZero, provider);
const signer = wallet.connect(provider);

async function main() {
  console.log(chalk.green.bold('\n0x Swap (Permit2) — Terminal Client\n'));
  console.log(chalk.gray(`Network chainId: ${config.CHAIN_ID}. RPC: ${config.RPC_URL}\n`));

  // Build token choices from TOKENS map
  const tokenChoices = Object.keys(TOKENS).map(k => ({ name: `${k} — ${TOKENS[k].address}`, value: k }));
  tokenChoices.unshift({ name: 'ETH (native)', value: 'ETH' });

  const answers = await inquirer.prompt([
    { type: 'list', name: 'sell', message: 'Select sell token:', choices: tokenChoices },
    { type: 'list', name: 'buy', message: 'Select buy token:', choices: tokenChoices.filter(c => c.value !== 'ETH' || true) },
    { type: 'input', name: 'amount', message: 'Sell amount (human readable, e.g. 0.1):', validate: s => s && !isNaN(Number(s)) },
    { type: 'confirm', name: 'simulateOnly', message: 'Simulate only? (Do not broadcast)', default: true },
  ]);

  const sellTokenInfo = answers.sell === 'ETH' ? { address: ETH_TOKEN, decimals: 18, symbol: 'ETH' } : TOKENS[answers.sell];
  const buyTokenInfo  = answers.buy === 'ETH' ? { address: ETH_TOKEN, decimals: 18, symbol: 'ETH' } : TOKENS[answers.buy];

  const sellAmountBase = toWei(answers.amount, sellTokenInfo.decimals);

  console.log(chalk.blue(`\nGetting indicative price for selling ${answers.amount} ${sellTokenInfo.symbol} → ${buyTokenInfo.symbol} ...\n`));
  const spinner = ora('Fetching price...').start();

  try {
    const priceResp = await getPrice({
      chainId: config.CHAIN_ID,
      sellToken: sellTokenInfo.address,
      buyToken: buyTokenInfo.address,
      sellAmount: sellAmountBase,
      taker: wallet.address
    });
    spinner.succeed('Price fetched');

    console.log(chalk.yellow('\nIndicative Price response:'));
    console.log(JSON.stringify({
      buyAmount: priceResp.buyAmount,
      estimatedGas: priceResp.estimatedGas || priceResp.gas,
      liquidityAvailable: priceResp.liquidityAvailable,
      issues: priceResp.issues || null
    }, null, 2));

    // Ask to proceed to quote
    const { fetchQuote } = await inquirer.prompt([{ type: 'confirm', name: 'fetchQuote', message: 'Fetch firm quote (permit2) and continue?', default: true }]);
    if (!fetchQuote) {
      console.log(chalk.green('Exiting — you chose not to fetch a quote.'));
      process.exit(0);
    }

    const qSpinner = ora('Requesting firm quote...').start();
    const quote = await getQuote({
      chainId: config.CHAIN_ID,
      sellToken: sellTokenInfo.address,
      buyToken: buyTokenInfo.address,
      sellAmount: sellAmountBase,
      taker: wallet.address
    });
    qSpinner.succeed('Quote retrieved');

    console.log(chalk.yellow('\nQuote summary:'));
    console.log({
      buyAmount: quote.buyAmount,
      gas: quote.estimatedGas || quote.gas,
      to: quote.transaction.to,
      value: quote.transaction.value,
      allowanceTarget: quote.allowanceTarget || (quote.issues && quote.issues.allowance && quote.issues.allowance.spender) || null,
      permitPresent: !!(quote.permit2 && quote.permit2.eip712)
    });

    // If permit2 eip712 exists, sign typed data and append signature
    let finalCalldata = quote.transaction.data;
    if (quote.permit2 && quote.permit2.eip712) {
      console.log(chalk.blue('\nPermit2 EIP-712 payload present in quote — signing...'));
      try {
        const signature = await signPermit2TypedData(signer, quote.permit2.eip712);
        finalCalldata = appendSignatureToCalldata(quote.transaction.data, signature);
        console.log(chalk.green('Permit2 signature created and appended to calldata.'));
      } catch (err) {
        console.error(chalk.red('Failed to sign Permit2 typed data:'), err.message);
        // We will still attempt simulation with original calldata (but it may fail if signature required)
      }
    } else {
      console.log(chalk.blue('No Permit2 EIP-712 payload in quote — ensure allowance set if needed.'));
    }

    // Build transaction object for simulation
    const tx = {
      to: quote.transaction.to,
      data: finalCalldata,
      value: quote.transaction.value ? ethers.BigNumber.from(quote.transaction.value) : ethers.BigNumber.from(0),
      from: wallet.address
    };

    // Simulate via eth_call
    console.log(chalk.blue('\nSimulating transaction with eth_call...'));
    try {
      const callResult = await provider.call(tx);
      console.log(chalk.green('Simulation successful. Call returned data (hex):'));
      console.log(callResult);
    } catch (callErr) {
      console.error(chalk.red('Simulation (eth_call) failed / reverted:'), callErr.message);
      // continue — user may want to still attempt sending
    }

    // Gas estimate
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

    // Show liquidity breakdown if present
    if (quote.sources) {
      console.log(chalk.yellow('\nLiquidity sources breakdown:'));
      console.log(quote.sources);
    } else if (quote.route) {
      console.log(chalk.yellow('\nRoute info:'));
      console.log(JSON.stringify(quote.route, null, 2));
    } else {
      console.log(chalk.gray('\nNo route/sources provided in API response.'));
    }

    // If user selected simulateOnly, stop here.
    if (answers.simulateOnly) {
      console.log(chalk.green('\nSIMULATION MODE: not broadcasting transaction.'));
      process.exit(0);
    }

    // Ask user to confirm send
    const { confirmSend } = await inquirer.prompt([{ type: 'confirm', name: 'confirmSend', message: 'Send transaction now?', default: false }]);
    if (!confirmSend) {
      console.log(chalk.green('Not sending. You can re-run with simulateOnly = false to attempt send.'));
      process.exit(0);
    }

    // Send transaction
    console.log(chalk.blue('Sending transaction...'));
    try {
      const sendTx = {
        to: quote.transaction.to,
        data: finalCalldata,
        value: tx.value
      };

      // If provider supports EIP-1559, specify maxFeePerGas etc. We'll let ethers populate defaults
      const sent = await signer.sendTransaction(sendTx);
      console.log(chalk.green('Transaction sent. Hash:'), sent.hash);
      console.log(chalk.gray('Waiting for 1 confirmation...'));
      const receipt = await sent.wait(1);
      console.log(chalk.green('Transaction mined! Receipt:'));
      console.log(receipt);
    } catch (sendErr) {
      console.error(chalk.red('Send failed:'), sendErr.message);
      console.log(chalk.yellow('Attempting to simulate again (safety)...'));
      try {
        const callResult2 = await provider.call(tx);
        console.log(chalk.green('Simulation successful. Call returned data (hex):'));
        console.log(callResult2);
      } catch (e2) {
        console.error(chalk.red('Simulation also failed:'), e2.message);
      }
    }

  } catch (err) {
    spinner.fail('Error fetching price/quote');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
}

main().catch(e => {
  console.error(chalk.red('Fatal error:'), e);
  process.exit(1);
});
