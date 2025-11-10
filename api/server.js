// api/server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { BN } from "bn.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Config ===
const PROGRAM_ID = new PublicKey("AiBawWM1dhGBfgs8dR8QidWhvFEu6MhfrtohbwCqeb8u");
const NETWORK = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";

// IDL path (for discriminator lookup)
const idlPath = path.join(process.cwd(), "target", "idl", "anchor_crud_item.json");
if (!fs.existsSync(idlPath)) throw new Error("IDL not found at " + idlPath);
const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

// helper: find instruction discriminator buffer from IDL
function instrDiscriminator(name) {
  const instr = (idl.instructions || []).find((i) => i.name === name);
  if (!instr || !instr.discriminator) throw new Error("Instruction not found in IDL: " + name);
  return Buffer.from(instr.discriminator);
}

// helper: compute PDA
function getItemPDA(ownerPubkey, id) {
  const idBuf = new BN(id).toArrayLike(Buffer, "le", 8);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("item"), ownerPubkey.toBuffer(), idBuf],
    PROGRAM_ID
  );
  return pda;
}

// helper: encode "create" / "update" / "delete" instruction data manually
// create/update args: id (u64 LE), name (string with u32 length LE + bytes), value (u32 LE)
// delete args: id (u64 LE)
// read uses account fetch (no instruction)
function encodeCreateOrUpdateArgs(id, name, value) {
  const nameBuf = Buffer.from(name, "utf8");
  const nameLen = nameBuf.length;
  const totalLen = 8 /*discriminator*/ + 8 /*id*/ + 4 /*name len*/ + nameLen + 4 /*value*/;
  const buf = Buffer.alloc(totalLen);
  let offset = 0;
  // discriminator must be prepended by the caller
  offset += 8; // leave space for discriminator (caller will copy it)
  // id (u64 le)
  const idBuf = new BN(id).toArrayLike(Buffer, "le", 8);
  idBuf.copy(buf, offset); offset += 8;
  // name length (u32 le)
  buf.writeUInt32LE(nameLen, offset); offset += 4;
  // name bytes
  nameBuf.copy(buf, offset); offset += nameLen;
  // value (u32 le)
  buf.writeUInt32LE(value, offset); offset += 4;
  return buf;
}

function encodeDeleteArgs(id) {
  const totalLen = 8 /*discriminator*/ + 8 /*id*/;
  const buf = Buffer.alloc(totalLen);
  // leave first 8 bytes for discriminator
  const idBuf = new BN(id).toArrayLike(Buffer, "le", 8);
  idBuf.copy(buf, 8);
  return buf;
}

// helper: build final instruction data (discriminator + args buffer without its first 8 bytes)
function buildInstrDataFromArgs(discriminatorBuf, argsBuf) {
  // argsBuf is already sized with a leading 8 bytes reserved for discriminator in helpers above.
  // Copy discriminator into the first 8 bytes and return the buffer.
  const out = Buffer.from(argsBuf); // copy
  discriminatorBuf.copy(out, 0);
  return out;
}

// helper: parse Item account data buffer (we know the layout from your program)
function decodeItemAccount(data) {
  if (!data || data.length < 8 + 32 + 8 + 50 + 4 + 1) {
    throw new Error("Data too small to be Item");
  }
  let offset = 0;
  const disc = data.slice(offset, offset + 8); offset += 8;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const id = new BN(data.slice(offset, offset + 8), "le").toNumber(); offset += 8;
  const nameBytes = data.slice(offset, offset + 50); offset += 50;
  // trim 0 bytes
  let end = nameBytes.indexOf(0);
  if (end === -1) end = nameBytes.length;
  const name = nameBytes.slice(0, end).toString("utf8");
  const value = data.readUInt32LE(offset); offset += 4;
  const bump = data.readUInt8(offset); offset += 1;
  return { owner: owner.toBase58(), id, name, value, bump, dataLen: data.length };
}

// === Server & connection ===
const app = express();
app.use(cors());
app.use(express.json());

const connection = new Connection(NETWORK, "confirmed");

// log IDL load
console.log("Loaded IDL:", idl.metadata?.name, "v" + (idl.metadata?.version || "unknown"));
console.log("Network:", NETWORK);
console.log("Program:", PROGRAM_ID.toString());

// ROUTES

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    program: PROGRAM_ID.toString(),
    network: NETWORK,
    idl_name: idl.metadata?.name,
  });
});

// CREATE
app.post("/api/items", async (req, res) => {
  try {
    const { ownerPrivateKey, id, name, value } = req.body;
    if (!ownerPrivateKey || id === undefined || name === undefined || value === undefined) {
      return res.status(400).json({ error: "Missing fields ownerPrivateKey, id, name, value" });
    }
    if (name.length > 50) return res.status(400).json({ error: "Name too long (max 50 bytes)" });

    const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(ownerPrivateKey));
    const ownerPubkey = ownerKeypair.publicKey;
    const itemPDA = getItemPDA(ownerPubkey, id);
    console.log("Create: owner", ownerPubkey.toBase58(), "itemPDA", itemPDA.toBase58());

    // build data
    const discriminator = instrDiscriminator("create");
    const argsBuf = encodeCreateOrUpdateArgs(id, name, value);
    const data = buildInstrDataFromArgs(discriminator, argsBuf);

    // keys (match your accounts in instruction: user, item, system_program)
    const keys = [
      { pubkey: ownerPubkey, isSigner: true, isWritable: true },
      { pubkey: itemPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys,
      data,
    });

    // build, sign and send tx
    const block = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction({ recentBlockhash: block.blockhash, feePayer: ownerPubkey });
    tx.add(ix);
    tx.sign(ownerKeypair);
    const signed = tx;
    const raw = signed.serialize();
    const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
    await connection.confirmTransaction({ signature: sig, ...block }, "confirmed");

    res.json({
      success: true,
      signature: sig,
      itemAddress: itemPDA.toBase58(),
      explorerUrl: `https://explorer.solana.com/tx/${sig}?cluster=devnet`,
    });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// READ single
app.get("/api/items/:owner/:id", async (req, res) => {
  try {
    const { owner, id } = req.params;
    const ownerPubkey = new PublicKey(owner);
    const itemPDA = getItemPDA(ownerPubkey, parseInt(id));
    const acc = await connection.getAccountInfo(itemPDA, "confirmed");
    if (!acc) return res.status(404).json({ error: "Item account not found", itemAddress: itemPDA.toBase58() });
    const parsed = decodeItemAccount(acc.data);
    return res.json({ success: true, itemAddress: itemPDA.toBase58(), ...parsed });
  } catch (err) {
    console.error("Read error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// READ ALL for owner
app.get("/api/items/:owner", async (req, res) => {
  try {
    const { owner } = req.params;
    const ownerPubkey = new PublicKey(owner);

    // memcmp offset = 8 (discriminator) since owner pubkey is stored immediately after discriminator
    const filters = [
      {
        memcmp: {
          offset: 8,
          bytes: ownerPubkey.toBase58(),
        },
      },
    ];
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, { filters, commitment: "confirmed" });
    const items = accounts.map(a => {
      try {
        const parsed = decodeItemAccount(a.account.data);
        return {
          address: a.pubkey.toBase58(),
          ...parsed,
          dataLen: a.account.data.length,
          explorerUrl: `https://explorer.solana.com/address/${a.pubkey.toBase58()}?cluster=devnet`
        };
      } catch (e) {
        return { address: a.pubkey.toBase58(), decodeError: e.message, dataLen: a.account.data.length };
      }
    });
    res.json({ success: true, count: items.length, items });
  } catch (err) {
    console.error("Read all error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// UPDATE
app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerPrivateKey, name, value } = req.body;
    if (!ownerPrivateKey || name === undefined || value === undefined) {
      return res.status(400).json({ error: "Missing ownerPrivateKey, name or value" });
    }
    if (name.length > 50) return res.status(400).json({ error: "Name too long (max 50 bytes)" });

    const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(ownerPrivateKey));
    const ownerPubkey = ownerKeypair.publicKey;
    const itemPDA = getItemPDA(ownerPubkey, parseInt(id));

    // build data
    const discriminator = instrDiscriminator("update");
    const argsBuf = encodeCreateOrUpdateArgs(id, name, value);
    const data = buildInstrDataFromArgs(discriminator, argsBuf);

    // keys: owner (signer), item (mut)
    const keys = [
      { pubkey: ownerPubkey, isSigner: true, isWritable: false }, // note: in your Accounts struct owner is signer but not marked mut
      { pubkey: itemPDA, isSigner: false, isWritable: true },
    ];

    const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

    // sign & send
    const block = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction({ recentBlockhash: block.blockhash, feePayer: ownerPubkey });
    tx.add(ix);
    tx.sign(ownerKeypair);
    const raw = tx.serialize();
    const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
    await connection.confirmTransaction({ signature: sig, ...block }, "confirmed");

    res.json({ success: true, signature: sig, itemAddress: itemPDA.toBase58() });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DELETE
app.delete("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { ownerPrivateKey } = req.body;
    if (!ownerPrivateKey) return res.status(400).json({ error: "ownerPrivateKey required" });

    const ownerKeypair = Keypair.fromSecretKey(Uint8Array.from(ownerPrivateKey));
    const ownerPubkey = ownerKeypair.publicKey;
    const itemPDA = getItemPDA(ownerPubkey, parseInt(id));

    const discriminator = instrDiscriminator("delete");
    const argsBuf = encodeDeleteArgs(id);
    const data = buildInstrDataFromArgs(discriminator, argsBuf);

    const keys = [
      { pubkey: ownerPubkey, isSigner: true, isWritable: false },
      { pubkey: itemPDA, isSigner: false, isWritable: true },
    ];

    const ix = new TransactionInstruction({ programId: PROGRAM_ID, keys, data });

    const block = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction({ recentBlockhash: block.blockhash, feePayer: ownerPubkey });
    tx.add(ix);
    tx.sign(ownerKeypair);
    const raw = tx.serialize();
    const sig = await connection.sendRawTransaction(raw, { skipPreflight: false, preflightCommitment: "confirmed" });
    await connection.confirmTransaction({ signature: sig, ...block }, "confirmed");

    res.json({ success: true, signature: sig, itemAddress: itemPDA.toBase58() });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("═══════════════════════════════════════════════════");
  console.log("🚀 Solana CRUD API Server Started");
  console.log("═══════════════════════════════════════════════════");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Network: ${NETWORK}`);
  console.log(`Program ID: ${PROGRAM_ID.toString()}`);
  console.log("Endpoints:");
  console.log("  POST   /api/items               - Create item (ownerPrivateKey in body)");
  console.log("  GET    /api/items/:owner        - Get all items");
  console.log("  GET    /api/items/:owner/:id    - Get single item");
  console.log("  PUT    /api/items/:id           - Update item (ownerPrivateKey in body)");
  console.log("  DELETE /api/items/:id           - Delete item (ownerPrivateKey in body)");
  console.log("═══════════════════════════════════════════════════");
});
