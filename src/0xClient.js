// src/0xClient.js
/**
 * 0x Swap API helpers (complete file)
 *
 * - Chain-aware: chooses the appropriate 0x base URL for supported chains.
 * - Exposes getPrice and getQuote which call /swap/permit2/price and /swap/permit2/quote.
 * - Robust error formatting for axios responses.
 *
 * IMPORTANT:
 * 0x does not support every chain ID. If you set CHAIN_ID to an unsupported chain,
 * this module will throw a helpful error with the list of supported chains and
 * their 0x base endpoints.
 *
 * Supported chains and endpoints (common list, pulled from 0x docs / error responses):
 *  - 1        => https://api.0x.org             (Ethereum Mainnet)
 *  - 10       => https://optimism.api.0x.org
 *  - 56       => https://bsc.api.0x.org
 *  - 137      => https://polygon.api.0x.org
 *  - 42161    => https://arbitrum.api.0x.org
 *  - 43114    => https://avalanche.api.0x.org
 *  - 8453     => https://base.api.0x.org
 *  - (plus other chains may be supported by 0x; if you need one added, update this map)
 *
 * If you attempt to use Sepolia (11155111) or another chain not present here,
 * the client will request that you pick a supported chain (or add it to this map).
 */

const axios = require('axios');
const qs = require('qs');
const { ZEROX_API_KEY } = require('./config');

const CHAIN_BASES = {
  1: 'https://api.0x.org',             // Ethereum Mainnet
  10: 'https://optimism.api.0x.org',   // Optimism
  56: 'https://bsc.api.0x.org',        // Binance Smart Chain
  137: 'https://polygon.api.0x.org',   // Polygon
  42161: 'https://arbitrum.api.0x.org',// Arbitrum
  43114: 'https://avalanche.api.0x.org',// Avalanche
  8453: 'https://base.api.0x.org',     // Base
  80001: 'https://mumbai.api.0x.org',  // Mumbai (if supported)
  // Add more mappings here if 0x publishes more endpoints.
};

/**
 * Get the 0x base URL for a given chainId.
 * Throws an informative error if the chain is not in our map.
 */
function get0xBaseUrl(chainId) {
  if (CHAIN_BASES[chainId]) return CHAIN_BASES[chainId];
  // If chain not supported, give a helpful error
  const available = Object.entries(CHAIN_BASES)
    .map(([id, url]) => `${id} -> ${url}`)
    .join('\n  ');
  throw new Error(
    `0x Swap API: unsupported chainId ${chainId} for direct API calls.\n` +
    `Supported chain IDs and base URLs:\n  ${available}\n\n` +
    `If you need a different chain (e.g., Sepolia) 0x may not provide a public API base for it. ` +
    `Use a supported chain (e.g. 1 for mainnet) or update CHAIN_BASES in src/0xClient.js.`
  );
}

/**
 * GET /swap/permit2/price
 */
async function getPrice({ chainId, sellToken, buyToken, sellAmount, taker }) {
  const base = get0xBaseUrl(chainId);
  const url = `${base}/swap/permit2/price`;
  const params = { chainId, sellToken, buyToken, sellAmount, taker };
  try {
    const res = await axios.get(url, {
      params,
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'brackets' }),
      headers: buildHeaders(),
      timeout: 20000
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, url);
  }
}

/**
 * GET /swap/permit2/quote
 */
async function getQuote({ chainId, sellToken, buyToken, sellAmount, taker }) {
  const base = get0xBaseUrl(chainId);
  const url = `${base}/swap/permit2/quote`;
  const params = { chainId, sellToken, buyToken, sellAmount, taker };
  try {
    const res = await axios.get(url, {
      params,
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'brackets' }),
      headers: buildHeaders(),
      timeout: 20000
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, url);
  }
}

/** Helper: attach headers (include 0x-api-key if present) */
function buildHeaders() {
  const headers = { '0x-version': 'v2' };
  if (ZEROX_API_KEY) headers['0x-api-key'] = ZEROX_API_KEY;
  return headers;
}

/** Format axios errors into readable Error */
function formatAxiosError(err, url = '') {
  if (err.response) {
    // pretty-print response body where possible
    const body = JSON.stringify(err.response.data, null, 2);
    return new Error(`0x API error: ${err.response.status} ${err.response.statusText} (${url})\n${body}`);
  } else if (err.request) {
    return new Error(`0x API no response. Request made to ${url} but no response returned.`);
  } else {
    return new Error(`0x API request error: ${err.message}`);
  }
}

module.exports = { getPrice, getQuote, get0xBaseUrl, CHAIN_BASES };
