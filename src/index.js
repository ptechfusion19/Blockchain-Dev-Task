#!/usr/bin/env node
require('dotenv').config();
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { simulateSwap } = require('./simulator');

const FROM_ADDRESS = '0x59CadF9199248b50d40a6891c9E329eA13a88d31'; // your provided public address

const argv = yargs(hideBin(process.argv)).options({
  example: { type: 'number', alias: 'e', describe: 'Run example (1,2,3)' },
  verbose: { type: 'boolean', alias: 'v', describe: 'Verbose: save raw responses to logs and reduce terminal noise', default: false },
  best: { type: 'boolean', alias: 'b', describe: 'Select and simulate only the single best route (show only that in terminal)', default: false }
}).argv;

function makeLogPath() {
  const now = new Date();
  const iso = now.toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'logs', `sim-${iso}.log`);
}

async function runExample(n, verbose = false, bestOnly = false) {
  n = Number(n);
  const logPath = verbose ? makeLogPath() : null;
  if (verbose) console.log(`Verbose mode: logging details to ${logPath}`);

  if (n === 1) {
    const params = {
      srcTokenAddress: '0x0000000000000000000000000000000000000000',
      dstTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      srcTokenBlockchain: 'ETH',
      dstTokenBlockchain: 'ETH',
      srcTokenAmount: '0.1',
      slippage: 0.01,
      referrer: 'rubic.exchange',
      fromAddress: FROM_ADDRESS
    };
    await simulateSwap(params, { showRaw: false, verbose, logPath, bestOnly });
  } else if (n === 2) {
    const params = {
      srcTokenAddress: '0x0000000000000000000000000000000000000000',
      dstTokenAddress: '0x0000000000000000000000000000000000000000',
      srcTokenBlockchain: 'ETH',
      dstTokenBlockchain: 'POLYGON',
      srcTokenAmount: '0.05',
      slippage: 0.03,
      referrer: 'rubic.exchange',
      fromAddress: FROM_ADDRESS
    };
    await simulateSwap(params, { showRaw: false, verbose, logPath, bestOnly });
  } else if (n === 3) {
    const params = {
      srcTokenAddress: '0x0000000000000000000000000000000000000000',
      dstTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      srcTokenBlockchain: 'ETH',
      dstTokenBlockchain: 'ETH',
      srcTokenAmount: '1000000',
      slippage: 0.01,
      referrer: 'rubic.exchange',
      fromAddress: FROM_ADDRESS
    };
    await simulateSwap(params, { showRaw: false, verbose, logPath, bestOnly });
  } else {
    console.log('Usage: node src/index.js --example 1|2|3 [--verbose] [--best]');
  }
}

runExample(argv.example, argv.verbose, argv.best).catch(err => {
  console.error('Error running example:', err.payload?.data ?? err.response?.data ?? err.message ?? err);
});
