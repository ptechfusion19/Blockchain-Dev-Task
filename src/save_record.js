// src/save_record.js
import dotenv from "dotenv";
dotenv.config();
import { connect, getCollection, close } from "./db.js";

function usage() {
  console.log(`
Usage (flags):
  node src/save_record.js --image "<imageUri>" --metadata "<metadataUri>" --mint "<mintAddress>" --ata "<ataAddress>" --sig "<txSig>"

Example:
  node src/save_record.js \\
    --image "https://gateway.irys.xyz/..." \\
    --metadata "https://gateway.irys.xyz/..." \\
    --mint "A4As..." \\
    --ata "Dvcn..." \\
    --sig "3QXj..."
`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i+1];
      out[key] = val;
      i++;
    }
  }
  return out;
}

async function run() {
  const args = parseArgs();
  if (!args.image || !args.metadata || !args.mint || !args.ata || !args.sig) {
    usage();
  }

  await connect();
  const col = getCollection();

  const doc = {
    imageUri: args.image,
    metadataUri: args.metadata,
    mint: args.mint,
    ata: args.ata,
    mintTxSignature: args.sig,
    createdAt: new Date()
  };

  // insert or upsert by mint (so re-running with same mint replaces)
  try {
    await col.updateOne(
      { mint: doc.mint },
      { $set: doc, $setOnInsert: { insertedAt: new Date() } },
      { upsert: true }
    );
    console.log("Saved record for mint:", doc.mint);
  } catch (err) {
    console.error("Error saving record:", err);
  } finally {
    await close();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
