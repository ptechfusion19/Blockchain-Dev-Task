/**
 * api/routes/sell.js
 * CommonJS version to match server.js
 */

const express = require('express');
const router = express.Router();
const { getPrice, getQuote } = require('../../src/0xClient');
const config = require('../../src/config');

// POST /sell
router.post('/', async (req, res, next) => {
  try {
    const { sellToken, buyToken, sellAmount, taker, simulateOnly = true } = req.body;

    if (!sellToken || !buyToken || !sellAmount || !taker) {
      return res.status(400).json({ error: 'Missing required fields: sellToken, buyToken, sellAmount, taker' });
    }

    // 1) Indicative price
    const price = await getPrice({
      chainId: config.CHAIN_ID,
      sellToken,
      buyToken,
      sellAmount,
      taker
    });

    // If no liquidity and caller didn't force, return the price info
    if (!price.liquidityAvailable) {
      return res.json({ note: 'no-liquidity', price });
    }

    // 2) Get firm quote
    const quote = await getQuote({
      chainId: config.CHAIN_ID,
      sellToken,
      buyToken,
      sellAmount,
      taker
    });

    if (!quote || !quote.transaction) {
      return res.json({ note: 'quote_no_tx', quote });
    }

    // 3) Prepare tx object
    const tx = {
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: quote.transaction.value || '0'
    };

    // 4) Simulate via eth_call (best-effort using provider from config)
    const ethers = require('ethers');
    const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || config.RPC_URL, config.CHAIN_ID);

    let simulation = { success: null, returnData: null, error: null };
    try {
      const callRes = await provider.call({
        to: tx.to,
        data: tx.data,
        value: ethers.BigNumber.from(tx.value || '0').toHexString(),
        from: taker
      });
      simulation.success = true;
      simulation.returnData = callRes;
    } catch (simErr) {
      simulation.success = false;
      simulation.error = simErr && (simErr.message || String(simErr));
    }

    // 5) Gas estimate
    let gasEstimate = null;
    try {
      gasEstimate = await provider.estimateGas({
        to: tx.to,
        data: tx.data,
        value: ethers.BigNumber.from(tx.value || '0').toHexString(),
        from: taker
      });
      gasEstimate = gasEstimate.toString();
    } catch (e) {
      gasEstimate = null;
    }

    // 6) Respond
    return res.json({
      price,
      quote,
      transaction: tx,
      permit2: quote.permit2 ? { eip712: quote.permit2.eip712 } : null,
      simulation,
      gasEstimate
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
