# Solana Card Engine

**Solana Card Purchasing System — Anchor + API server**

A on-chain card store built with Anchor (Rust) that mints SPL tokens when users pay SOL. The repo contains an Anchor program (`programs/my-user-card`) that holds program-owned SOL and mints three card tokens (Gold, Platinum, Silver) on purchase, plus a API server (`api_server`) that exposes HTTP endpoints to interact with the program.

---

## Key features

* Three card tiers (SPL tokens): **Gold**, **Platinum**, **Silver**.
* Fixed prices (paid in SOL):

  * Gold = 1 SOL
  * Platinum = 0.5 SOL
  * Silver = 0.25 SOL
* Mint-on-purchase: paying N SOL mints N tokens to the buyer's wallet (e.g., 10 SOL -> 10 tokens).
* All SOL funds are stored in the program (PDA) — only an admin can withdraw.
* HTTP API server that constructs + signs (or helps construct) buy and admin transactions.
* Proper error handling and checks (invalid tier, insufficient lamports, unauthorized withdraws, etc.).

---

## Repo layout

```
├─ api_server/                # Node/TypeScript API that talks to the Anchor program
├─ migrations/               
├─ programs/
│  └─ my-user-card/           # Anchor program (Rust)
├─ tests/                     
├─ Anchor.toml
├─ package.json
└─ README.md                  
```

---

## How it works (high level)

1. User calls the API endpoint (or directly calls the program) to buy a card specifying tier + amount.
2. API / client sends a transaction that transfers SOL to the program's PDA and calls the `buy_card` instruction.
3. The Anchor program verifies the transfer amount, determines how many tokens to mint for the chosen tier, and mints the corresponding number of SPL tokens to the buyer's Associated Token Account (ATA).
4. The SOL received is kept inside the program's PDA. Only the admin (a designated authority) can call `withdraw_funds` to transfer SOL out of the PDA.

---

## Prerequisites

* Rust toolchain (stable) and `cargo`
* Anchor framework and CLI (`npm i -g @project-serum/anchor` or `npm install --save-dev @project-serum/anchor`)
* Solana CLI (`solana`)
* Node.js (v16+/v18+), npm or yarn (for `api_server`)
* A wallet for deploying / admin operations (local keypair or funded devnet key)

---

## Quickstart (local development)

1. Clone the repo

```bash
git clone https://github.com/wali-hu/solana-card-engine.git
cd solana-card-engine
```

2. Start local validator (in a separate terminal)

```bash
solana-test-validator --reset
```

3. Build + deploy the Anchor program (to localnet)

```bash
anchor build
anchor deploy --provider.cluster localnet
```

4. Install and run API server

```bash
cd api_server
npm install
npm run dev
```

> If you prefer devnet, update `Anchor.toml` and your Solana config (`solana config set --url https://api.devnet.solana.com`) and deploy to devnet. Make sure your admin wallet is funded.

---

## API endpoints

### POST /buy

Buy cards and mint tokens.
**Request JSON**

```json
{
  "tier": "gold",        // gold | platinum | silver
  "amount": 10,           // number of SOL to spend, must be a positive number
  "buyer": "<BUYER_PUBKEY>" // buyer's wallet pubkey
}
```

**Response**

* `200 OK` — `{ "tx": "<signature>", "minted": 10 }`
* `400 Bad Request` — invalid tier or payload.
* `402 Payment Required` — insufficient SOL paid (or mismatch between expected price and provided amount).

**cURL example**

```bash
curl -X POST http://localhost:3000/buy \
  -H 'Content-Type: application/json' \
  -d '{"tier":"gold","amount":1,"buyer":"<BUYER_PUBKEY>"}'
```

### POST /withdraw

Admin-only: withdraw SOL from the program PDA to admin wallet.
**Request JSON**

```json
{ "amount_lamports": 1000000000, "admin": "<ADMIN_PUBKEY>" }
```

**Response**

* `200 OK` — `{ "tx": "<signature>", "withdrawn": <lamports> }`
* `403 Forbidden` — caller not admin.

### GET /config

Returns program addresses, token mint addresses, and configured prices.

### GET /health

Returns `200` when service is up.

---

## Anchor program notes (developer)

* The program should use a PDA as the SOL vault (e.g. `Pubkey::find_program_address(&[b"vault"], program_id)`), ensuring only the program can control those lamports.
* Token minting: the program either owns/initializes three SPL mint accounts (Gold/Platinum/Silver) or uses existing mints. On each buy instruction it mints `n` tokens to the buyer's ATA (create ATA if missing).
* Price math: convert SOL -> lamports (1 SOL = 1_000_000_000 lamports). For example, gold price = 1_000_000_000 lamports per token. If buyer pays `X` lamports, number minted = `X / price_per_token` (must check for exact divisibility or define rounding rules).
* Admin authority: the program must store an `admin` pubkey in a config account (set at initialization) and check `ctx.accounts.admin` on withdraw.

---

## Error handling (suggested error codes)

* `InvalidTier` (400) — tier not in [gold,platinum,silver].
* `InsufficientPayment` (402) — sent lamports less than expected for at least 1 token.
* `Unauthorized` (403) — non-admin attempted admin-only action.
* `AtaCreationFailed` (500) — failed to create ATA.
* `MintFailed` (500) — mint_to CPI failed.

---

## License

MIT