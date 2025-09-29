// src/db.js
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "solana_tokens";
const collName = process.env.COLLECTION || "token_mints";

if (!uri) {
  console.error("MONGODB_URI not set in .env. See .env.example");
  process.exit(1);
}

const client = new MongoClient(uri, {});

let cachedDb = null;

export async function connect() {
  if (!client.isConnected && !cachedDb) {
    await client.connect();
    cachedDb = client.db(dbName);
    // optional: create index on mint for fast lookup
    await cachedDb.collection(collName).createIndex({ mint: 1 }, { unique: true, sparse: true });
  }
  return cachedDb;
}

export function getCollection() {
  if (!cachedDb) throw new Error("Call connect() first");
  return cachedDb.collection(collName);
}

export async function close() {
  await client.close();
}
