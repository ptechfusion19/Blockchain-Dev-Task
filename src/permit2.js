// src/permit2.js
/**
 * Helpers to sign Permit2 EIP-712 data and append signature bytes
 * to the quote.transaction.data (per 0x docs).
 *
 * Key rule from 0x docs: append a 32-byte big-endian length, followed
 * by the signature bytes. The final calldata is:
 *   finalData = quote.transaction.data || <32-byte-siglen> || <sig bytes>
 *
 * See 0x docs: "Append signature length and signature data to transaction.data".
 * :contentReference[oaicite:13]{index=13}
 */
const ethers = require('ethers');
const { hexConcat } = require('./utils');

/**
 * Sign the typed data object returned under quote.permit2.eip712
 * using ethers v5 signer (which exposes _signTypedData).
 *
 * The object usually looks like:
 * { domain: {...}, types: {...}, message: {...} }
 */
async function signPermit2TypedData(signer, eip712Payload) {
  if (!eip712Payload || !eip712Payload.domain) {
    throw new Error('Invalid permit2 EIP-712 payload from 0x quote.');
  }
  // ethers v5: signer._signTypedData(domain, types, message)
  const signature = await signer._signTypedData(
    eip712Payload.domain,
    eip712Payload.types,
    eip712Payload.message
  );
  return signature; // hex string 0x...
}

/**
 * Append signature length (32 bytes) and signature to calldata.
 * finalData is hex string.
 */
function appendSignatureToCalldata(calldataHex, signatureHex) {
  // Remove 0x prefixes, build: calldata || sigLen(32 bytes) || sig
  const sig = signatureHex.replace(/^0x/, '');
  const sigLen = sig.length / 2; // bytes

  // encode sigLen as 32-byte big endian hex
  const lenHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(sigLen), 32).replace(/^0x/, '');
  const final = '0x' + calldataHex.replace(/^0x/, '') + lenHex + sig;
  return final;
}

module.exports = { signPermit2TypedData, appendSignatureToCalldata };
