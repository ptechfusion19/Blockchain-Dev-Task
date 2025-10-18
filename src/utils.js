// src/utils.js
const { ethers } = require('ethers');

const CHAIN_RPC_DEFAULTS = {
  ETH: process.env.ETHEREUM_RPC || 'https://cloudflare-eth.com',
  POLYGON: process.env.POLYGON_RPC || 'https://polygon-rpc.com'
  // Add more chain short codes and RPCs as needed
};

function getProviderForChain(chainShort) {
  const rpc = CHAIN_RPC_DEFAULTS[chainShort];
  if (!rpc) {
    throw new Error(`No RPC configured for chain code: ${chainShort}`);
  }
  return new ethers.JsonRpcProvider(rpc);
}

function formatWeiAmount(wei, decimals = 18) {
  try {
    return ethers.formatUnits(wei.toString(), decimals);
  } catch (e) {
    return wei;
  }
}

module.exports = {
  getProviderForChain,
  formatWeiAmount
};
