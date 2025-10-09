// src/utils.js
const ethers = require('ethers');

function toWei(amount, decimals = 18) {
  // amount is a decimal string or number
  return ethers.utils.parseUnits(String(amount), decimals).toString();
}

function fromWei(bn, decimals = 18) {
  return ethers.utils.formatUnits(bn.toString(), decimals);
}

function hexConcat(...hexes) {
  // concatenate hex strings (with/without 0x)
  return '0x' + hexes.map(h => h.replace(/^0x/, '')).join('');
}

module.exports = { toWei, fromWei, hexConcat };
