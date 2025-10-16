// api/routes/buy.js
/**
 * POST /buy
 * Body:
 * {
 *   "sellToken": "<address or 0xEeee...EEeE for ETH>",
 *   "buyToken": "<address>",
 *   "sellAmount": "<string in human units OR wei>",   // prefer wei-string to avoid decimals
 *   "buyAmount": "<optional, alternate>",
 *   "taker": "<user address>",
 *   "simulateOnly": true   // default true
 * }
 *
 * Response:
 * {
 *   quote: { ... },            // full 0x quote JSON (if returned)
 *   transaction: { to, data, value, gas },
 *   simulation: { success: bool, returnData: '0x...' }  // if simulated
 *   permit2: { eip712: {...} } // if present (server does NOT sign)
 * }
 */

const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const { getPrice, getQuote } = require('../../src/0xClient');
const { ETH_TOKEN } = require('../../src/tokens');
const config = require('../../src/config');

// provider (use same RPC you configured)
const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL, config.CHAIN_ID);

/** helper to normalize amount: assume caller provides wei string for safety */
function ensureWeiString(amount) {
  if (!amount) return null;
  // assume it's already a wei-string if it looks like integer digits
  if (/^[0-9]+$/.test(String(amount))) return String(amount);
  // otherwise, caller provided human decimal — throw to avoid ambiguity
  throw new Error('Please provide sellAmount as a wei string (integer string) to avoid decimal issues.');
}

router.post('/', async (req, res, next) => {
  try {
    const {
      sellToken, buyToken, sellAmount, buyAmount, taker, simulateOnly = true
    } = req.body;

    if (!sellToken || !buyToken) return res.status(400).json({ error: 'sellToken and buyToken are required' });
    if (!sellAmount && !buyAmount) return res.status(400).json({ error: 'sellAmount (wei string) or buyAmount required' });
    if (!taker) return res.status(400).json({ error: 'taker (user address) is required for quote' });

    // prefer sellAmount (wei string)
    const sellAmountWei = ensureWeiString(sellAmount || '');

    // 1) get an indicative price (optional) - helpful for immediate preview
    const price = await getPrice({
      chainId: config.CHAIN_ID,
      sellToken,
      buyToken,
      sellAmount: sellAmountWei,
      taker
    });

    // if no liquidity and user didn't force proceed, return price
    if (!price.liquidityAvailable) {
      return res.json({ note: 'no-liquidity', price });
    }

    // 2) request a firm quote (permit2 flow) — 0x will return transaction object
    const quote = await getQuote({
      chainId: config.CHAIN_ID,
      sellToken,
      buyToken,
      sellAmount: sellAmountWei,
      taker
    });

    // If quote doesn't include transaction -> return it for debug
    if (!quote || !quote.transaction) {
      return res.json({ note: 'quote_no_tx', quote });
    }

    const tx = {
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: quote.transaction.value || '0'
    };

    // If quote includes permit2 payload, return it but DO NOT sign server-side
    const permit2 = quote.permit2 ? { eip712: quote.permit2.eip712 } : null;

    // 3) simulate with eth_call (provider), using taker as from (safe if simulateOnly)
    let simulation = { success: null, returnData: null, error: null };
    try {
      const callResult = await provider.call({
        to: tx.to,
        data: tx.data,
        value: ethers.BigNumber.from(tx.value || '0').toHexString(),
        from: taker
      });
      simulation.success = true;
      simulation.returnData = callResult;
    } catch (simErr) {
      simulation.success = false;
      simulation.error = (simErr && simErr.message) ? simErr.message : String(simErr);
    }

    // 4) estimate gas (best-effort)
    let gasEstimate = null;
    try {
      gasEstimate = await provider.estimateGas({
        to: tx.to,
        data: tx.data,
        value: ethers.BigNumber.from(tx.value || '0').toHexString(),
        from: taker
      });
      gasEstimate = gasEstimate.toString();
    } catch (gErr) {
      gasEstimate = null;
    }

    // 5) respond
    const result = {
      price,
      quote,
      transaction: tx,
      permit2,
      simulation,
      gasEstimate
    };

    // If client asked to broadcast (simulateOnly==false) we will NOT broadcast from this server for safety.
    // Instead we return the transaction data for the client to sign & broadcast (recommended).
    if (!simulateOnly) {
      // warn: do not broadcast from server. return tx to client and instructions
      result.note = 'simulateOnly=false requested but server will NOT broadcast. Use tx data with wallet to sign/send.';
    }

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
