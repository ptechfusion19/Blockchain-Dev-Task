require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ethers = require('ethers');

const RPC = process.env.RPC_URL;
const PK  = process.env.PRIVATE_KEY;
if (!PK) { console.error('PRIVATE_KEY not set in .env (required for signing). Exiting.'); process.exit(1); }
const provider = new ethers.providers.JsonRpcProvider(RPC, Number(process.env.CHAIN_ID || 1));
const wallet = new ethers.Wallet(PK, provider);

async function main() {
  const file = path.join(__dirname, '..', 'buy_response.json');
  if (!fs.existsSync(file)) { console.error('buy_response.json not found. Save curl output to buy_response.json first.'); process.exit(1); }
  const resp = JSON.parse(fs.readFileSync(file, 'utf8'));

  if (!resp.quote || !resp.transaction) {
    console.error('Missing quote or transaction in buy_response.json');
    console.log(JSON.stringify(resp, null, 2));
    process.exit(1);
  }

  let txData = resp.transaction.data;
  const txObj = {
    to: resp.transaction.to,
    data: txData,
    value: ethers.BigNumber.from(resp.transaction.value || '0')
  };

  if (resp.permit2 && resp.permit2.eip712) {
    console.log('Signing Permit2 typed data...');
    const eip712 = resp.permit2.eip712;
    const signature = await wallet._signTypedData(eip712.domain, eip712.types, eip712.message);
    const sigNo0x = signature.replace(/^0x/, '');
    const sigLen = sigNo0x.length / 2;
    const lenHex = ethers.utils.hexZeroPad(ethers.utils.hexlify(sigLen), 32).replace(/^0x/, '');
    txObj.data = '0x' + txData.replace(/^0x/, '') + lenHex + sigNo0x;
    console.log('Signature appended to calldata.');
  } else {
    console.log('No permit2 payload found — nothing to sign.');
  }

  console.log('Simulating eth_call with signed calldata (from wallet address)...');
  try {
    const callRes = await provider.call({
      to: txObj.to,
      data: txObj.data,
      value: txObj.value.toHexString(),
      from: await wallet.getAddress()
    });
    console.log('Simulation success. returnData:', callRes);
  } catch (err) {
    console.error('Simulation failed:', err.message || err);
  }

  // Uncomment to broadcast (DANGER on mainnet):
  // const sent = await wallet.sendTransaction(txObj);
  // console.log('Broadcasted tx hash:', sent.hash);
  // await sent.wait(1);
  // console.log('Tx mined.');
}

main().catch(e => { console.error(e); process.exit(1); });
