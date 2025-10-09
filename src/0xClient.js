// src/0xClient.js
/**
 * 0x REST helpers: price & quote using /swap/permit2 endpoints.
 *
 * We use axios to call 0x API endpoints. The code is built around the
 * /swap/permit2 endpoints (price & quote). 0x returns a `transaction`
 * object ready for submission and a `permit2.eip712` object when
 * permit2 signature is required. See 0x docs for details.
 *
 * Important: the API key must be set in headers: `0x-api-key: <key>`
 * See docs: https://0x.org/docs/0x-swap-api/guides/swap-tokens-with-0x-swap-api-permit2. :contentReference[oaicite:12]{index=12}
 */
const axios = require('axios');
const qs = require('qs');
const { ZEROX_API_KEY } = require('./config');

const ZEROX_BASE = 'https://api.0x.org';

async function getPrice({ chainId, sellToken, buyToken, sellAmount, taker }) {
  const url = `${ZEROX_BASE}/swap/permit2/price`;

  const params = {
    chainId,
    sellToken,
    buyToken,
    sellAmount,
    taker
  };
  try {
    const res = await axios.get(url, {
      params,
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'brackets' }),
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2'
      }
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err);
  }
}

async function getQuote({ chainId, sellToken, buyToken, sellAmount, taker }) {
  const url = `${ZEROX_BASE}/swap/permit2/quote`;
  const params = { chainId, sellToken, buyToken, sellAmount, taker };
  try {
    const res = await axios.get(url, {
      params,
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'brackets' }),
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        '0x-version': 'v2'
      }
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err);
  }
}

// Helpful error wrapper so CLI outputs meaningful errors
function formatAxiosError(err) {
  if (err.response) {
    return new Error(
      `0x API error: ${err.response.status} ${err.response.statusText}\n${JSON.stringify(err.response.data, null, 2)}`
    );
  } else if (err.request) {
    return new Error(`0x API no response. Request made but no response returned.`);
  } else {
    return new Error(`0x API request error: ${err.message}`);
  }
}

module.exports = { getPrice, getQuote };
