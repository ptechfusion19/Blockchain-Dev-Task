// src/tokens.js
// Sepolia token addresses — use these as example pairs. Always verify on a block explorer if you want to be 100% sure.
//
// ETH pseudo address used by 0x
const ETH_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

// Example Sepolia contracts (check on Sepolia Etherscan if you want to change / verify):
// WETH (Sepolia deploy commonly used by Uniswap deployments).
// (source: Uniswap deployments / Sepolia references)
const WETH = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14'; // Sepolia WETH. :contentReference[oaicite:9]{index=9}

// Common test USDC/DAI addresses on Sepolia — these vary: verify on etherscan before use.
const USDC = '0xf08a50178dfcde18524640ea6618a1f965821715'; // example Sepolia USDC listing. :contentReference[oaicite:10]{index=10}
const DAI  = '0x3e622317f8c93f7328350cf0b56d9ed4c620c5d6'; // example Sepolia DAI (community-provided). :contentReference[oaicite:11]{index=11}

module.exports = {
  TOKENS: {
    ETH: { symbol: 'ETH', address: ETH_TOKEN, decimals: 18 },
    WETH: { symbol: 'WETH', address: WETH, decimals: 18 },
    USDC: { symbol: 'USDC', address: USDC, decimals: 6 },
    DAI:  { symbol: 'DAI',  address: DAI,  decimals: 18 },
  },
  ETH_TOKEN
};
