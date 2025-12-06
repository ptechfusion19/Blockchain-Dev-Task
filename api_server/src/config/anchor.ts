import * as anchor from "@coral-xyz/anchor";
import { IDL } from "../idl/user_card_program";
import dotenv from "dotenv";

dotenv.config();

export const PROGRAM_ID = new anchor.web3.PublicKey(
  "9PznwD37XbYGLsDPfrxumNBBUY1HeBPb4uneRkX3r8vM"
);

export const ADMIN_PUBKEY = new anchor.web3.PublicKey(
  process.env.ADMIN_PUBKEY || "Fskji1sm9H8QwZBGmuRTTie6B111RhCfLtbALMaNRkt"
);

export const USER_PUBKEY = new anchor.web3.PublicKey(
  process.env.USER_PUBKEY || "FQ7zu26PVPCbiDuXtbFtHzMeVVtJSfQR4xwQDjsz8H7t"
);

export const CARD_PRICES: { [key: number]: number } = {
  0: 125_000_000,
  1: 250_000_000,
  2: 500_000_000,
  3: 1_000_000_000,
};

export const CARD_NAMES: { [key: number]: string } = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
  3: "Platinum",
};

// SPL Token Mint Address - From Environment Variable
export const CARD_MINT_PUBKEY_STRING = process.env.CARD_MINT_PUBKEY || "11111111111111111111111111111111";

export let CARD_MINT_PUBKEY: anchor.web3.PublicKey;
try {
  CARD_MINT_PUBKEY = new anchor.web3.PublicKey(CARD_MINT_PUBKEY_STRING);
} catch (e) {
  console.warn("⚠️ Invalid CARD_MINT_PUBKEY in .env, using placeholder");
  CARD_MINT_PUBKEY = new anchor.web3.PublicKey("11111111111111111111111111111111");
}

// Mint Authority - who can mint tokens (usually a PDA)
export const MINT_AUTHORITY_PUBKEY_STRING = process.env.MINT_AUTHORITY_PUBKEY || "";

export let MINT_AUTHORITY_PUBKEY: anchor.web3.PublicKey;
try {
  if (!MINT_AUTHORITY_PUBKEY_STRING) {
    throw new Error("MINT_AUTHORITY_PUBKEY not set");
  }
  MINT_AUTHORITY_PUBKEY = new anchor.web3.PublicKey(MINT_AUTHORITY_PUBKEY_STRING);
} catch (e) {
  console.warn("⚠️ MINT_AUTHORITY_PUBKEY not configured in .env");
  MINT_AUTHORITY_PUBKEY = new anchor.web3.PublicKey("11111111111111111111111111111111");
}

// Private Keys from Environment Variables
export function parsePrivateKeyArray(arrayStr: string | undefined): number[] {
  if (!arrayStr) return [];
  try {
    // Remove brackets and parse
    const cleaned = arrayStr.replace(/[\[\]]/g, "");
    return cleaned.split(",").map(x => parseInt(x.trim()));
  } catch (e) {
    return [];
  }
}

export const USER_PRIVATE_KEY_ARRAY = parsePrivateKeyArray(process.env.USER_PRIVATE_KEY_ARRAY);
export const ADMIN_PRIVATE_KEY_ARRAY = parsePrivateKeyArray(process.env.ADMIN_PRIVATE_KEY_ARRAY);

export function getAnchorProvider(connection: anchor.web3.Connection) {
  const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return provider;
}
