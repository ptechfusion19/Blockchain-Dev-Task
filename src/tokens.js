// src/tokens.js
// MAINNET token addresses — canonical commonly-used tokens.
// Make sure your .env is set to CHAIN_ID=1 and RPC_URL points to a mainnet provider.

const ETH_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // 0x pseudo-address for native ETH

const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'; // Mainnet WETH
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Mainnet USDC
const DAI  = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // Mainnet DAI

module.exports = {
  TOKENS: {
    ETH: { symbol: 'ETH', address: ETH_TOKEN, decimals: 18 },
    WETH: { symbol: 'WETH', address: WETH, decimals: 18 },
    USDC: { symbol: 'USDC', address: USDC, decimals: 6 },   
    DAI:  { symbol: 'DAI',  address: DAI,  decimals: 18 },
  },
  ETH_TOKEN
};
