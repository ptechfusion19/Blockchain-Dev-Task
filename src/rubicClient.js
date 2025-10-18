// src/rubicClient.js
const axios = require('axios');

const BASE = 'https://api-v2.rubic.exchange/api';

const defaultHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

async function postJson(url, body) {
  try {
    const resp = await axios.post(url, body, { headers: defaultHeaders });
    return resp.data;
  } catch (err) {
    const errPayload = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      config: err.config
    };
    const e = new Error('Rubic API request failed');
    e.payload = errPayload;
    throw e;
  }
}

async function quoteAll(params) {
  const url = `${BASE}/routes/quoteAll`;
  return await postJson(url, params);
}

async function quoteBest(params) {
  const url = `${BASE}/routes/quoteBest`;
  return await postJson(url, params);
}

async function requestSwap(params) {
  const url = `${BASE}/routes/swap`;
  return await postJson(url, params);
}

async function getCrossChainStatus(srcTxHash) {
  const url = `${BASE}/info/status?srcTxHash=${encodeURIComponent(srcTxHash)}`;
  try {
    const resp = await axios.get(url, { headers: defaultHeaders });
    return resp.data;
  } catch (err) {
    const e = new Error('Rubic status request failed');
    e.payload = { message: err.message, status: err.response?.status, data: err.response?.data };
    throw e;
  }
}

module.exports = {
  quoteAll,
  quoteBest,
  requestSwap,
  getCrossChainStatus
};
