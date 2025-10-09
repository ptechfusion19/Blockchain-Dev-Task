// scripts/check_liquidity.js
// Simple helper to iterate a list of token pairs and call 0x /swap/permit2/price
// Usage: node scripts/check_liquidity.js

const { getPrice } = require('../src/0xClient');
const config = require('../src/config');
const { TOKENS, ETH_TOKEN } = require('../src/tokens');

async function probePairs() {
  const pairs = [
    { sell: 'ETH', buy: 'WETH', amount: '0.01' },
    { sell: 'ETH', buy: 'USDC', amount: '0.01' },
    { sell: 'WETH', buy: 'USDC', amount: '0.01' },
    { sell: 'USDC', buy: 'DAI', amount: '10' }, // USDC has 6 decimals
    { sell: 'DAI', buy: 'USDC', amount: '10' }
  ];

  for (const p of pairs) {
    const sellInfo = p.sell === 'ETH' ? { address: ETH_TOKEN, decimals: 18 } : TOKENS[p.sell];
    const buyInfo  = p.buy === 'ETH' ? { address: ETH_TOKEN, decimals: 18 } : TOKENS[p.buy];

    const sellAmountBase = (sellInfo.decimals === 6)
      ? (BigInt(Math.trunc(Number(p.amount) * 1e6))).toString()
      : (BigInt(Number(p.amount) * (10 ** (sellInfo.decimals || 18)))).toString();

    console.log('\n---');
    console.log(`Pair: ${p.sell} -> ${p.buy}   sellAmount: ${p.amount}`);
    try {
      const res = await getPrice({
        chainId: config.CHAIN_ID,
        sellToken: sellInfo.address,
        buyToken: buyInfo.address,
        sellAmount: sellAmountBase,
        taker: '0x0000000000000000000000000000000000000000' // taker optional for price
      });
      console.log('liquidityAvailable:', res.liquidityAvailable);
      console.log('buyAmount:', res.buyAmount || '(none)');
      console.log('estimatedGas:', res.estimatedGas || res.gas || '(none)');
      if (res.issues) console.log('issues:', res.issues);
    } catch (err) {
      console.error('Error calling 0x price:', err.message || err);
    }
  }
}

probePairs().then(() => console.log('\nDone')).catch(e => console.error(e));
