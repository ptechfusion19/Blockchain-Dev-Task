// examples/example1_onchain.js
const { simulateSwap } = require('../src/simulator');

const FROM_ADDRESS = '0x59CadF9199248b50d40a6891c9E329eA13a88d31';

async function run() {
  console.log('\n== Example 1: On-chain ETH -> USDC (Ethereum) ==\n');
  const params = {
    srcTokenAddress: '0x0000000000000000000000000000000000000000', // ETH native
    dstTokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    srcTokenBlockchain: 'ETH',
    dstTokenBlockchain: 'ETH',
    srcTokenAmount: '0.1',
    slippage: 0.01,
    referrer: 'rubic.exchange',
    fromAddress: FROM_ADDRESS
  };
  await simulateSwap(params, { showRaw: false });
}

run().catch(err => {
  console.error('Example1 error:', err.payload?.data ?? err.response?.data ?? err.message ?? err);
});
