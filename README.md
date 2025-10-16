# 0x-matcha-swap — Terminal client + REST API for 0x Swap (Permit2-ready)

> Node.js project that integrates with the **0x Swap API** to get price & firm quotes, prepare transaction calldata (with Permit2 EIP-712 support), simulate (`eth_call`) and optionally broadcast swaps.
> Includes:
>
> * interactive terminal client (`src/index.js`)
> * Express REST API with `POST /buy` and `POST /sell` (`api/`)
> * helper scripts for signing/simulation (`scripts/`)
> * Permit2 signing helper and utils in `src/`

This `README.md` is a single place with **everything** you need to set up, run, test, and explain the project.

---

## Table of contents

* [Status / summary](#status--summary)
* [Project layout](#project-layout)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Environment (`.env`)](#environment-env)
* [How to run](#how-to-run)

  * [Start API server](#start-api-server)
  * [Run interactive terminal client (CLI)](#run-interactive-terminal-client-cli)
  * [Helpful scripts](#helpful-scripts)
* [API usage — `POST /buy` and `POST /sell`](#api-usage---post-buy-and-post-sell)

  * [Example `curl` requests](#example-curl-requests)
  * [Response fields explained](#response-fields-explained)
* [Permit2 flow (brief)](#permit2-flow-brief)
* [Tokens & special addresses used (mainnet)](#tokens--special-addresses-used-mainnet)
* [Testing & demo workflow (step-by-step)](#testing--demo-workflow-step-by-step)
* [Troubleshooting & common errors](#troubleshooting--common-errors)
* [License](#license)

---

## Status / summary

* Implemented both `POST /buy` and `POST /sell` REST endpoints that call the 0x Swap API, return price & firm quote, transaction calldata, permit2 typed-data (if present), do an `eth_call` simulation and attempt `estimateGas`.
* Implemented interactive terminal client (`src/index.js`) that replicates the same flow (get price → get quote → sign permit2 if present → simulate → optionally broadcast).
* Permit2 typed-data signing helper and append-signature logic included (`src/permit2.js`).
* Scripts included to derive taker address, create/save responses, sign Permit2 typed-data locally (simulation only), and re-run checks.

> Current testing was done on **Ethereum mainnet** (chainId = `1`). The REST API and CLI are usable with other chains supported by 0x if you adjust `CHAIN_ID` and tokens.

---

## Project layout

```
0x-matcha-swap/
├─ package.json
├─ .env.example
├─ .env                       # local copy (not committed)
├─ README.md
├─ src/
│  ├─ index.js                # Terminal client (interactive)
│  ├─ 0xClient.js             # 0x API wrapper (price/quote)
│  ├─ permit2.js              # Permit2 sign + calldata helpers
│  ├─ tokens.js               # Token address map & ETH pseudo address
│  ├─ utils.js                # helpers (toWei/fromWei)
│  └─ config.js               # env loader
├─ api/
│  ├─ server.js               # Express server (CommonJS)
│  └─ routes/
│     ├─ buy.js               # POST /buy
│     └─ sell.js              # POST /sell
└─ scripts/
   ├─ call_buy.js            # prints derived address from PRIVATE_KEY
   ├─ sign_and_send.js        # reads buy_response.json, signs permit2, simulates; broadcast commented
   └─ check_liquidity.js      # helper for probing price for many pairs (optional)
```

---

## Prerequisites

* Node.js (v18+ recommended) and npm
* An RPC provider URL (Alchemy, Infura, or your own node) — for mainnet use a mainnet RPC
* A 0x API key (optional, but recommended for higher rate limits)
* (Optional) A funded wallet/private key if you want to broadcast real transactions (not required for simulation)

---

## Installation

From project root:

```bash
# install app dependencies
npm install

# additional server deps (if not already installed)
npm install express cors helmet body-parser

# developer helper
npm i -D nodemon
```

---

## Environment (`.env`)

Copy `.env.example` to `.env` and fill values:

`.env.example` (fill and rename to `.env`):

```env
# .env -> copy from .env.example and fill

# Private key used for local signing/simulation (ONLY for dev/fork/test). Do not commit.
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# RPC provider (mainnet)
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_ALCHEMY_KEY

# Chain id (mainnet)
CHAIN_ID=1

# ZeroX API key (optional; recommended when hitting 0x API)
ZEROX_API_KEY=your_0x_api_key_here

# Port for REST API
PORT=3000

# Optional: multiplier applied to gas estimates
DEFAULT_GAS_MULTIPLIER=1.15
```

**Important:** Never commit private keys or secrets into source control.

---

## How to run

### Start API server (Terminal A)

```bash
# from project root
node api/server.js

# or dev auto-reload
npx nodemon api/server.js
```

You should see:

```
Swap API running on http://localhost:3000 (chainId=1)
```

### Run interactive terminal client (Terminal B)

The CLI is an interactive terminal-based flow:

```bash
node src/index.js
```

It will prompt:

* sell token (ETH or any token in `src/tokens.js`)
* buy token
* amount (human readable)
* simulate only? (yes/no)

The CLI:

* fetches indicative price,
* (optionally) fetches firm quote,
* signs Permit2 typed-data if present,
* simulates the transaction via `eth_call`,
* shows gas estimate & liquidity sources,
* optionally asks to broadcast.

### Helpful scripts

* derive taker address from `.env` PRIVATE_KEY:

```bash
node scripts/get_taker.js
```

* call API programmatically (example Node script):

```bash
node scripts/call_buy.js   # if included/created
```

* sign Permit2 and simulate final calldata (reads `buy_response.json` — created by `curl -o buy_response.json ...`):

```bash
node scripts/sign_and_send.js
# NOTE: broadcasting lines are commented in script for safety. Uncomment only if you understand the risks.
```

---

## API usage — `POST /buy` and `POST /sell`

**Endpoints**

* `POST /buy` — get a buy quote (you provide sell token & amount, taker)
* `POST /sell` — get a sell quote (sell token & amount, taker)

**Request body (JSON)**

```json
{
  "sellToken": "<token address|0xEeee...EEeE for ETH>",
  "buyToken": "<token address|0xEeee...EEeE for ETH>",
  "sellAmount": "<integer string: amount in token smallest units (wei-like)>",
  "taker": "0xYourTakerAddress",
  "simulateOnly": true  // optional (default true)
}
```

> **Important**: Provide `sellAmount` as an integer string representing the smallest unit (wei for ETH/18-decimals, or 6-digit units for USDC). This avoids floating point rounding.

### Example `curl` requests

Save result to file:

```bash
curl -s -X POST http://localhost:3000/buy \
  -H "Content-Type: application/json" \
  -d '{
    "sellToken":"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "buyToken":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "sellAmount":"4000000000000000",
    "taker":"0x28450BB47eF79dc74E752641DBf5b1085a4ab564",
    "simulateOnly":true
  }' -o buy_response.json
```

Sell example:

```bash
curl -s -X POST http://localhost:3000/sell \
  -H "Content-Type: application/json" \
  -d '{
    "sellToken":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "buyToken":"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "sellAmount":"4000000000000000",
    "taker":"0x28450BB47eF79dc74E752641DBf5b1085a4ab564",
    "simulateOnly":true
  }' -o sell_response.json
```

### Response fields explained (main ones)

* `price` — indicative price response (may contain `buyAmount`, `estimatedGas`, `liquidityAvailable`, `issues`)
* `quote` — full 0x quote JSON (may include `permit2`, `transaction`, `sources`, `route`)
* `transaction` — simplified `{ to, data, value }` (call this transaction to execute swap)
* `permit2` — if present: `quote.permit2.eip712` typed-data the client must sign
* `simulation` — `{ success, returnData, error }` from `eth_call`
* `gasEstimate` — provider gas estimate (best-effort)
* `route` / `sources` — liquidity breakdown (which DEX / source was used)

---

## Permit2 flow (brief)

When 0x chooses a path that uses Permit2, the firm `quote` may include `quote.permit2.eip712`. Flow:

1. API returns `permit2.eip712` typed-data to client (or CLI).
2. Client wallet signs EIP-712 typed-data (e.g. `wallet._signTypedData(domain, types, message)` in ethers).
3. Append the signature to the quote `transaction.data` according to 0x expectations (helper included in `src/permit2.js`).
4. Send the final tx (client signs & broadcasts or server broadcasts if you enable server-side signing — not recommended without KMS & ACL).

`src/permit2.js` includes:

* `signPermit2TypedData(signer, eip712)` — sign typed data
* `appendSignatureToCalldata(calldata, signature)` — append len + sig bytes

---

## Tokens & special addresses used (mainnet)

* Special ETH pseudo-address used in project:
  `ETH_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`

Common tokens (mainnet examples included in `src/tokens.js`):

* WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
* DAI:  `0x6B175474E89094C44Da98b954EedeAC495271d0F`
* USDC: `0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`

> If you want other token lists or testnet addresses you can update `src/tokens.js`.

---

## Testing & demo workflow (step-by-step)

This sequence reproduces typical developer/demo flow (use two terminals):

1. **Terminal A** — start server

   ```bash
   node api/server.js
   ```

2. **Terminal B** — derive taker address from `.env` (if you stored `PRIVATE_KEY`)

   ```bash
   node scripts/get_taker.js
   ```

3. **Terminal B** — call `POST /buy` and save response

   ```bash
   curl -s -X POST http://localhost:3000/buy \
     -H "Content-Type: application/json" \
     -d '{
       "sellToken":"0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
       "buyToken":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
       "sellAmount":"4000000000000000",
       "taker":"<TAKER_ADDR>",
       "simulateOnly":true
     }' -o buy_response.json
   jq . buy_response.json
   ```

4. Inspect `buy_response.json`:

   * If `simulation.success === true` → simulation passed (rare on mainnet if account has zero funds).
   * If `simulation` shows `insufficient funds` or `execution reverted` → check `quote.issues` for `balance`/`allowance` problems and fund the taker or use forked chain for demo.

5. If `permit2` present, sign & simulate using:

   ```bash
   node scripts/sign_and_send.js
   ```

   (This reads `buy_response.json` and uses `PRIVATE_KEY` to sign typed-data locally; broadcasting lines are commented.)

6. Optionally, broadcast the transaction using client wallet (recommended) or uncomment broadcasting in scripts only when you understand the cost.

---

## Troubleshooting & common errors

* **`Invalid ethereum address`** from 0x: ensure `taker` is a valid 0x-prefixed address and `sellToken`/`buyToken` are token addresses or `0xEeee...EEeE` for ETH.
* **`liquidityAvailable: false`**: try a different pair or amount; some pairs have limited liquidity or are not supported on certain chains.
* **`Simulation failed: insufficient funds`**: the taker has zero ETH but the transaction requires `value` (ETH) + gas. Fund the taker on a fork or use a forked node for simulation.
* **`Simulation failed: execution reverted`**: usually because the taker lacks token balance or approval for ERC-20 sell flows. Ensure token balance and allowance (or use Permit2 flow).
* **`chalk` / `ora` import errors**: code uses safe interop. If you see `chalk.red is not a function` or `ora is not a function` update packages or use included safe import shim in server/CLI files.
* **`0x INPUT_INVALID (chainId)`**: 0x API only supports specific chain IDs; ensure `CHAIN_ID` is valid for 0x. (Mainnet is `1`.)
* **`Quotes stale`**: quotes are time-sensitive — re-quote before sending and include slippage tolerance.

---

## Security & production considerations

* **Do not store or expose PRIVATE_KEY** in source or logs. Use KMS (AWS KMS, HashiCorp Vault) if server-side signing is required.
* **Prefer client-side signing**: design to return typed-data and transaction object to client; the client signs and broadcasts.
* **Add API authentication and rate limits** if exposing to users.
* **Rate limits**: 0x has rate limits; use API key for higher limits.
* **Sanitize & validate inputs** (addresses, amounts) in production.
* **Monitor gas / quote changes**: quotes can change quickly — warn users and re-check before sending.

---

## License

MIT


