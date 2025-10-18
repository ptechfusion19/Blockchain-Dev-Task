// examples/example3_failed.js
const { simulateSwap } = require('../src/simulator');

const FROM_ADDRESS = '0x59CadF9199248b50d40a6891c9E329eA13a88d31';

async function run() {
  console.log('\n== Example 3: Likely-failed swap (huge amount) ==\n');
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
  await simulateSwap(params);
}

run().catch(err => {
  console.error('Example3 error:', err.payload?.data ?? err.response?.data ?? err.message ?? err);
});
