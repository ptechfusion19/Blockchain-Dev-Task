import { tryBuy } from "four-flap-meme-sdk";
import "dotenv/config";
const rpcUrl = process.env.RPC_URL;
const tokenAddress = "0x3533230f448e04e0c0b87ddfdd5f7b38647f4444";
const amount = 10000n * 10n ** 18n;
// Buy specific token amount

const estimate = await tryBuy("BSC", rpcUrl, tokenAddress, amount, 0);

console.log(estimate);
