// src/fetch_records.js
import dotenv from "dotenv";
dotenv.config();
import { connect, getCollection, close } from "./db.js";

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
  await connect();
  const col = getCollection();

  let cursor;
  if (args.mint) {
    cursor = col.find({ mint: args.mint });
  } else {
    cursor = col.find().sort({ createdAt: -1 }).limit(50);
  }

  const results = await cursor.toArray();
  if (results.length === 0) {
    console.log("No records found.");
  } else {
    for (const r of results) {
      console.log("----");
      console.log("Mint:", r.mint);
      console.log("ATA:", r.ata);
      console.log("Image URI:", r.imageUri);
      console.log("Metadata URI:", r.metadataUri);
      console.log("Mint tx sig:", r.mintTxSignature);
      console.log("Inserted:", r.createdAt);
    }
  }

  await close();
}

run().catch(err => { console.error(err); process.exit(1); });
