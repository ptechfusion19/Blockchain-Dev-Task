import { trySell } from "four-flap-meme-sdk";
import "dotenv/config";

const rpcUrl = process.env.RPC_URL;
const tokenAddress = "0x3533230f448e04e0c0b87ddfdd5f7b38647f4444";
const amountToSell = 1_000n * 10n ** 18n; // 1,000 tokens

const estimate = await trySell(
  "BSC",
  rpcUrl,
  tokenAddress,
  amountToSell // Token amount to sell
);
console.log("You will receive:", estimate.funds, "wei");
console.log("Fee:", estimate.fee, "wei");
