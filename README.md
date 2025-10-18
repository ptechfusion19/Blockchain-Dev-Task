# Rubic Swap Simulator 

A Node.js **simulation** tool that queries the Rubic.finance API for swap quotes, requests route-specific transaction payloads, and performs pre-execution simulation (`estimateGas` + `eth_call`) against RPC nodes — **without** signing or broadcasting any transactions.

This tool is meant for pre-trade analysis: comparing routes, fees, slippage, and identifying potentially failing swaps before users attempt them.

> ⚠️ **Safety:** This tool only ever uses **public addresses**. Do **not** paste private keys. The simulator will never sign or broadcast transactions.

---

## Repository contents

- `src/` — application code
  - `index.js` — CLI entry (examples + flags)
  - `simulator.js` — main simulation logic (quoteAll, requestSwap, estimateGas, call)
  - `rubicClient.js` — small client for Rubic API
  - `utils.js` — RPC provider helpers
- `examples/` — pre-built example scripts
- `logs/` — (created at runtime) stores verbose run logs
- `package.json` — dependencies and scripts

---

## Quick start

1. Clone or copy the repo to your machine.
2. Install Node dependencies:

```bash
npm install
````

3. (Optional) Add custom RPC endpoints in `.env` (see `.env.example`):

```
ETHEREUM_RPC=Infura/Alchemy
ETHERSCAN_API_KEY=YOUR_API_KEY
```

4. Run examples (no private keys required):

```bash
# Example 1 — on-chain ETH -> USDC (Ethereum)
node src/index.js --example 1

# Example 2 — cross-chain ETH -> MATIC (Polygon)
node src/index.js --example 2

# Example 3 — intentionally large amount (likely-failed)
node src/index.js --example 3
```

---

## Recommended command options

* `--verbose` (or `-v`): Create a timestamped log file under `logs/` containing the full `quoteAll` response, all `requestSwap` responses, and every simulation object. Terminal prints are kept compact to avoid overflow.

* `--best` (or `-b`): The simulator still fetches **all** routes, then ranks them and **selects the single best route** (by USD or destination tokens, fallback to price impact). It will print a compact, human-friendly summary and the **full simulation** (estimateGas + provider.call) for **only** that best route to the terminal. All full raw details (all routes) are saved in the log file when `--verbose` is used.

### Examples

```bash
# Best route only (compact terminal output); no log file
node src/index.js --example 1 --best

# Best route only, but save everything (raw responses + details) into a timestamped log file
node src/index.js --example 1 --best --verbose

# Simulate all routes (previous behavior — prints everything, may be long)
node src/index.js --example 1
```

When using `--verbose`, you will see a message like:

```
Verbose mode: logging details to /path/to/project/logs/sim-2025-10-18T10-48-27-633Z.log
```

Open that file to inspect the full JSON responses.

---

## What the simulator prints (terminal)

When using `--best` (recommended for readable terminal output):

* A compact **Selected Route Summary**:

  * input amount & chain
  * provider name and route type
  * expected destination and minimum (after slippage)
  * estimated USD destination
  * Rubic fee breakdown (protocol / provider / gas estimate)

* **Simulation result** for that route:

  * `estimateGas` value and approximate native cost
  * `provider.call` (eth_call) result:

    * if call succeeded: `callResult (hex)` (often empty `0x` for functions that don't return)
    * if reverted: RPC revert message printed (useful to diagnose failures)

All other routes and raw API data are written to the log file when `--verbose` is used.

---

## Where logs are stored

Logs are saved into the `logs/` directory with filenames like:

```
logs/sim-2025-10-18T10-48-27-633Z.log
```

Each verbose run writes:

* the full `quoteAll` response,
* each `requestSwap` response and any errors,
* simulation results (estimateGas, callResult, revert messages),
* a selected-route summary object.

The logs have ANSI color codes stripped so they're readable in editors.

---

## How "best route" is chosen

The scoring preference is:

1. `destinationUsdAmount` (if present) — higher is better
2. `destinationTokenAmount` / `destinationAmount` — higher is better
3. Negative `priceImpact` — lower price impact preferred

If you prefer a different ranking (e.g. always maximize destination token amount), tell me and I can change the comparator.

---

## Interpreting `provider.call` (eth_call) results

* A **successful call** may return empty `0x` (many contract functions do not return data). Success means the transaction would not revert at that point in a node-level simulation.
* A **revert** will usually produce an RPC error with a message like `execution reverted: reason` — this is shown in the terminal for the selected route (or saved in logs).
* If you want to decode returned ABI-encoded values, you can use `ethers` `Interface` with the exact function ABI and `iface.decodeFunctionResult()` on the returned hex.

---

## Troubleshooting & notes

* **EstimateGas / call differences:** RPC nodes sometimes require the `from` address to have funds to simulate correctly. For best accuracy use a real funded public address (no private keys needed). The project uses the address you provided in `src/index.js` (it never uses any private key).
* **`requestSwap` errors from Rubic:** The simulator prints Rubic's errors (and saves detailed responses in logs). Typical causes include unsupported `fromAddress`, invalid chain codes, or provider-specific constraints. Read the error array in the logs for precise reasons.
* **Large verbose output:** Use `--best --verbose` to keep terminal compact while saving everything. If you want the full JSON for only the selected route, we can add a separate `--save-selected` or `--json-output` flag.

---

## Developer notes

* Rubic API endpoints used:

  * `/api/routes/quoteAll` — to get multi-route quotes
  * `/api/routes/swap` — to get route-specific transaction payloads (TransactionDto)
* RPCs used come from `.env` variables (see `.env.example`) or sensible defaults:

  * `ETHEREUM_RPC`, `POLYGON_RPC`, etc.
* This tool intentionally never holds or requests private keys — it only needs public addresses for simulation and approval checks.

---

