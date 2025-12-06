import * as anchor from "@coral-xyz/anchor";
import { PROGRAM_ID, CARD_PRICES, CARD_NAMES } from "../config/anchor";

export function cardTypeToEnum(cardType: number) {
  return { [cardType]: {} };
}

export function getPDAForUser(userPubkey: anchor.web3.PublicKey) {
  const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("user_card"), userPubkey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function getCardPrice(cardType: number): number {
  return CARD_PRICES[cardType] || 0;
}

export function getCardName(cardType: number): string {
  return CARD_NAMES[cardType] || "Unknown";
}

export function lamportsToSOL(lamports: number): number {
  return lamports / 1_000_000_000;
}

export function SOLToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function keypairFromSecretKey(secretKey: number[]): anchor.web3.Keypair {
  return anchor.web3.Keypair.fromSecretKey(new Uint8Array(secretKey));
}
