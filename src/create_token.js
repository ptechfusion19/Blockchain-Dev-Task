// src/create_token.js
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

import {
  generateSigner,
  signerIdentity,
  keypairIdentity,
  createGenericFile,
  percentAmount,
  sol,
} from "@metaplex-foundation/umi";

import { base58 } from "@metaplex-foundation/umi/serializers";

import bs58 from "bs58";

import { Connection, Keypair as Web3Keypair } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  createAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

// -------------------- config --------------------
const payer = process.env.WALLET; // expects base58 secret key
if (!payer) {
  console.error("ERROR: set WALLET in .env to your base58 secret key");
  process.exit(1);
}
const secretKey = bs58.decode(payer);
const keypair = Web3Keypair.fromSecretKey(new Uint8Array(secretKey));

const RPC = process.env.RPC_URL || "https://api.devnet.solana.com";
const IMAGE_FILE = path.resolve(process.cwd(), "./image.png"); // ensure this exists
const CLUSTER = "devnet"; // explorer cluster query param
const DECIMALS = 9; // set decimals for mint

// -------------------- helper --------------------
function pubKeyToString(pk) {
  if (!pk) return String(pk);
  if (Array.isArray(pk) && pk.length > 0) pk = pk[0];
  if (typeof pk === "string") return pk;
  if (pk && typeof pk.toBase58 === "function") return pk.toBase58();
  if (pk && typeof pk.toString === "function") return pk.toString();
  return String(pk);
}

// -------------------- main --------------------
async function main() {
  // 1) Umi client with token-metadata, toolbox and irys uploader
  const umi = createUmi(RPC).use(mplTokenMetadata()).use(mplToolbox()).use(irysUploader());

  // set umi identity to your payer (so uploader & other calls have a signer)
  const payerUmiSigner = umi.eddsa.createKeypairFromSecretKey(keypair.secretKey);
  umi.use(keypairIdentity(payerUmiSigner));
  console.log("Using identity:", pubKeyToString(umi.identity.publicKey));

  // (Optional) airdrop 1 SOL on devnet so we can pay for txs
  try {
    console.log("Requesting 1 SOL airdrop to identity (devnet)...");
    await umi.rpc.airdrop(umi.identity.publicKey, sol(1));
  } catch (err) {
    console.warn("Airdrop failed (maybe not devnet or RPC rate-limited):", err.message || err);
  }

  // 2) Upload image to Arweave via Irys
  if (!fs.existsSync(IMAGE_FILE)) {
    throw new Error(`Image file not found at ${IMAGE_FILE} — please add image.png to project root.`);
  }
  const imageBytes = fs.readFileSync(IMAGE_FILE);
  const umiImageFile = createGenericFile(imageBytes, "image.png", {
    tags: [{ name: "Content-Type", value: "image/png" }],
  });

  console.log("Uploading image to Arweave (Irys)...");
  const imageUris = await umi.uploader.upload([umiImageFile]).catch((err) => {
    throw err;
  });
  const imageUri = Array.isArray(imageUris) ? imageUris[0] : imageUris;
  console.log("Image URI:", imageUri);

  // 3) Create metadata JSON and upload
  const metadata = {
    name: "Example Token (Token-2022)",
    symbol: "EXMPL2022",
    description: "An example Token-2022 token created via spl-token + Metaplex metadata (Devnet)",
    image: imageUri,
  };

  console.log("Uploading metadata JSON to Arweave...");
  const metadataUri = await umi.uploader.uploadJson(metadata).catch((err) => {
    throw err;
  });
  console.log("Metadata URI:", metadataUri);

  // -------------------- TOKEN-2022: create mint, ATA, mint tokens --------------------
  const connection = new Connection(RPC, "confirmed");

  console.log("Creating Token-2022 mint (owned by TOKEN_2022_PROGRAM_ID)...");
  // Create a mint Keypair we control so the mint account can sign later.
  const mintKeypair = Web3Keypair.generate();

  // createMint(connection, payer, mintAuthority, freezeAuthority, decimals, keypair?, confirmOptions?, programId?)
  const mintPubkey = await createMint(
    connection,
    keypair, // payer (web3 Keypair)
    keypair.publicKey, // mintAuthority
    null, // freezeAuthority
    DECIMALS, // decimals
    mintKeypair, // use our Keypair so we hold the secret
    undefined, // confirmOptions
    TOKEN_2022_PROGRAM_ID // create mint owned by Token-2022 program
  );

  console.log("Token-2022 mint created:", mintPubkey.toBase58());

  console.log("Creating/getting associated token account (ATA) for the mint (Token-2022 ATA)...");
  const ata = await createAccount(
    connection,
    keypair, // payer
    mintPubkey, // mint
    keypair.publicKey, // owner
    false, // allowOwnerOffCurve
    undefined, // confirm options
    TOKEN_2022_PROGRAM_ID // derive ATA for Token-2022
  );

  console.log("Associated Token Account (ATA):", ata.toBase58());

  // Mint tokens to ATA
  const AMOUNT_TOKENS = 1000n; // human-readable tokens
  const amountSmallest = AMOUNT_TOKENS * (10n ** BigInt(DECIMALS));

  console.log(`Minting ${AMOUNT_TOKENS} tokens (${amountSmallest} smallest units) to ATA...`);
  const mintSig = await mintTo(
    connection,
    keypair, // payer
    mintPubkey, // mint
    ata, // destination
    keypair, // authority (mint authority)
    amountSmallest, // amount (BigInt supported)
    [], // multiSigners
    undefined, // confirm options
    TOKEN_2022_PROGRAM_ID // mint using Token-2022 program
  );

  console.log("mintTo tx signature:", mintSig);
  console.log(`Explorer tx: https://explorer.solana.com/tx/${mintSig}?cluster=${CLUSTER}`);

  // -------------------- Metaplex metadata: create on-chain metadata account pointing to metadataUri --------------------
  // Convert the mint Web3 keypair secret into a UMI signer (so the mint can be included as a signer)
  const mintUmiKeypair = umi.eddsa.createKeypairFromSecretKey(mintKeypair.secretKey);

  console.log("Creating on-chain Metaplex Metadata (createV1) pointing to uploaded metadataUri...");
  const { createV1 } = await import("@metaplex-foundation/mpl-token-metadata");

  // createV1 accepts a signer object for `mint` — passing mintUmiKeypair makes the mint a signer
  const createMetaIx = createV1(umi, {
    mint: mintUmiKeypair, // signer that corresponds to the mint account
    name: metadata.name,
    uri: metadataUri,
    symbol: metadata.symbol,
    sellerFeeBasisPoints: percentAmount(0),
    updateAuthority: umi.identity.publicKey,
  });

  // send metadata creation via umi (mint signer included)
  const metaTx = await createMetaIx.sendAndConfirm(umi);
  const metaSig = base58.deserialize(metaTx.signature)[0];
  console.log("Metadata create tx sig:", metaSig);
  console.log(`Metadata tx explorer: https://explorer.solana.com/tx/${metaSig}?cluster=${CLUSTER}`);

  // Print results
  console.log("=== RESULT ===");
  console.log("Mint address:", mintPubkey.toBase58());
  console.log("ATA:", ata.toBase58());
  console.log("Mint tx:", `https://explorer.solana.com/tx/${mintSig}?cluster=${CLUSTER}`);
  console.log("Metadata tx:", `https://explorer.solana.com/tx/${metaSig}?cluster=${CLUSTER}`);
  console.log("Metadata URI (off-chain JSON):", metadataUri);

  console.log("Done.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
