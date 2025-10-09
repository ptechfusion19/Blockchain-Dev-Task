// src/config.js
require('dotenv').config();

const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111); // Sepolia default
module.exports = {
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  RPC_URL: process.env.RPC_URL || 'https://rpc.sepolia.org',
  CHAIN_ID,
  ZEROX_API_KEY: process.env.ZEROX_API_KEY,
  GAS_MULTIPLIER: Number(process.env.DEFAULT_GAS_MULTIPLIER || 1.15)
};
