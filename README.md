# Anchor_CURD_Item 

> Minimal, useful, and *kmaal* — a tiny Solana + Anchor CRUD app (create/read/update/delete) with a REST API.

This repo contains:

* an Anchor program (Rust) that stores a simple `Item` account (owner, id, name, value, bump),
* an Express API that calls the program using raw `TransactionInstruction`s and
* helper scripts (IDL patcher, diagnostics).

---

#  Quick TL;DR (run me)

```bash
# 1) build program & generate IDL
anchor build

# 2) deploy to devnet (uses your anchor wallet / ~/.config/solana/anchor-devnet.json)
anchor deploy --provider.cluster devnet

# 3) patch IDL (if required)
node scripts/fix-idl.cjs

# 4) install node deps
npm install

# 5) run the API server
node api/server.js
```

After server starts, use the API endpoints below (or Postman / curl).

---

#  File structure (important parts)

```
anchor_crud_item/
├─ Anchor.toml
├─ programs/
│  └─ anchor_crud_item/
│     └─ src/lib.rs          # Anchor program
├─ target/idl/
│  └─ anchor_crud_item.json  # IDL used by server
├─ api/
│  └─ server.js              # Express API (raw tx instructions)
├─ scripts/
│  └─ fix-idl.cjs            # copy types -> accounts.type when missing
├─ tests/
│  └─ anchor_crud_item.ts    # anchor mocha tests
├─ package.json
└─ README.md                 # (you are here)
```

---

#  What the program does (brief)

* Account: `Item { owner: Pubkey, id: u64, name: [u8;50], value: u32, bump: u8 }`
* PDA seeds: `[b"item", owner_pubkey, id.to_le_bytes()]`
* Instructions:

  * `create(id, name, value)` — init PDA, owner pays, stores fields
  * `update(id, name, value)` — only owner can update
  * `delete(id)` — close PDA, lamports returned to owner
  * `read(id)` — emits event (API reads account directly instead)
* Name is fixed 50 bytes for deterministic layout and simpler decode.

---

#  Requirements

* Rust toolchain (as used by Anchor toolchain)
* Anchor CLI (v0.32.1 recommended)
* Solana CLI
* Node.js (18+ recommended), npm/yarn
* `jq` (optional, for IDL debug)

---

#  Setup & commands (detailed)

## Build & compile (Rust)

```bash
anchor build
```

## Run unit tests (deploys to devnet + runs TS tests)

```bash
anchor test
```

> `anchor test` will deploy the program to devnet (or the configured cluster) and run the tests.

## Deploy to devnet

```bash
anchor deploy --provider.cluster devnet
```

## If IDL lacks account type metadata (fix)

```bash
node scripts/fix-idl.cjs
```

This copies matching `types` entries into `accounts[].type` in `target/idl/*.json`.

## Install JS deps + run server

```bash
npm install
node api/server.js
```

---

#  REST API (server: `node api/server.js`, default `http://localhost:3000`)

All endpoints talk to Devnet (or `ANCHOR_PROVIDER_URL` if set).
**Note:** For create/update/delete the API expects `ownerPrivateKey` in the body (dev/test only). Never send private keys in production.

## Endpoints

### Health

```
GET /health
```

### Create item

```
POST /api/items
Body JSON:
{
  "ownerPrivateKey": [ /* 64 numbers */ ],
  "id": 1,
  "name": "My First Item",
  "value": 100
}
```

Returns `{ success: true, signature, itemAddress, ... }`

### Read single item

```
GET /api/items/:owner/:id
```

Example:
`GET /api/items/<OWNER_PUBKEY>/1`
Returns decoded account fields.

### Read all items for owner

```
GET /api/items/:owner
```

Uses `getProgramAccounts` with memcmp to find all items for owner.

### Update item

```
PUT /api/items/:id
Body JSON:
{
  "ownerPrivateKey": [ /* 64 numbers */ ],
  "name": "New name",
  "value": 999
}
```

### Delete item

```
DELETE /api/items/:id
Body JSON:
{
  "ownerPrivateKey": [ /* 64 numbers */ ]
}
```

---

#  Testing (local/devnet)

* `anchor test` — runs test suite (deploys to cluster, runs tests written in `tests/*.ts`).
* The TS tests use Anchor provider (ensure `ANCHOR_PROVIDER_URL` and `ANCHOR_WALLET` are set if you override defaults).

---

#  Keypair: generate, find, fund, and private-key array

## Generate keypair (CLI)

```bash
solana-keygen new --outfile ~/.config/solana/my-devnet.json
```

## Show public key

```bash
solana-keygen pubkey ~/.config/solana/my-devnet.json
```

## Show private key array (copy for Postman only in dev)

```bash
cat ~/.config/solana/my-devnet.json
# prints the 64-number array (use that exact array in JSON bodies)
```

or with node (prints array)

```bash
node -e "console.log(require(process.env.HOME + '/.config/solana/my-devnet.json'))"
```

## Fund on Devnet

```bash
solana airdrop 2 <PUBLIC_KEY> --url https://api.devnet.solana.com
```

---

#  How to verify & debug on-chain

* Transaction explorer:

  * `https://explorer.solana.com/tx/<SIG>?cluster=devnet`
* Account explorer:

  * `https://explorer.solana.com/address/<PUBKEY>?cluster=devnet`
* Program info:

```bash
solana program show <PROGRAM_ID> --url https://api.devnet.solana.com
```

* Fetch on-chain IDL:

```bash
anchor idl fetch <PROGRAM_ID> --provider.cluster devnet > idl-from-chain.json
jq . idl-from-chain.json
```

---

#  Security notes (read carefully)

* **Do not** expose or store raw private keys in public or production systems.
* The current API accepts `ownerPrivateKey` for convenience/testing only.
* For production user flows: integrate Phantom (client-side signing) or other wallets. The server should send unsigned txs to clients for signature, or use its own secure vault for admin workflows.
* Validate all inputs server-side (we check name length). Add more checks where needed.

---

# Credits & references

* Anchor v0.32.1 conventions
* Solana Web3.js
* @coral-xyz/anchor


