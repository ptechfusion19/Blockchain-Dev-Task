// examples/example2_crosschain.js
const { simulateSwap } = require('../src/simulator');

const FROM_ADDRESS = '0x59CadF9199248b50d40a6891c9E329eA13a88d31';

async function run() {
  console.log('\n== Example 2: Cross-chain ETH (Ethereum) -> MATIC (Polygon) ==\n');
  const params = {
    srcTokenAddress: '0x0000000000000000000000000000000000000000', // ETH
    dstTokenAddress: '0x0000000000000000000000000000000000000000', // MATIC native on Polygon
    srcTokenBlockchain: 'ETH',
    dstTokenBlockchain: 'POLYGON',
    srcTokenAmount: '0.05',
    slippage: 0.03,
    referrer: 'rubic.exchange',
    fromAddress: FROM_ADDRESS
  };
  await simulateSwap(params);
}

run().catch(err => {
  console.error('Example2 error:', err.payload?.data ?? err.response?.data ?? err.message ?? err);
});
