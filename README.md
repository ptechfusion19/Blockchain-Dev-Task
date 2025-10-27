# BatchMint1155 — ERC-1155 batch mint & distribute (Foundry)

A gas-conscious ERC-1155 contract that mints the **same token id (1)** to many recipients in a single transaction.
This repo contains the contract, Foundry scripts, and Solidity tests so you can build, test, deploy and interact end-to-end.

---

## What this project does

* Mint the same ERC-1155 token (`TOKEN_ID = 1`) to multiple addresses in one owner-only transaction.
* Two distribution functions:

  * `mintAndDistributeSameAmount(address[] recipients, uint256 amount)` — mint same `amount` to each recipient.
  * `mintAndDistributeVariableAmounts(address[] recipients, uint256[] amounts)` — mint a different `amounts[i]` to each `recipients[i]`.
* Gas & safety focused:

  * Direct `_mint` to recipients (no intermediate mint→transfer).
  * `ReentrancyGuard`.
  * `maxRecipients` guard to avoid accidental block gas exhaustion.
  * Uses OpenZeppelin ERC-1155 acceptance checks for contract recipients.

---

## Repository layout

```
batch-erc1155-foundry/
├── src/
│   └── BatchMint1155.sol        # Main contract
├── script/
│   ├── DeployBatchMint.s.sol    # Deployment script
├── test/
│   └── BatchMint1155Test.t.sol  # Only-Solidity tests (forge)
├── foundry.toml
├── remappings.txt
├── .env                         # (local only — store your RPC key + PRIVATE_KEY here)
└── README.md
```

---

## Prerequisites

* Linux / macOS / WSL or similar
* [Foundry (forge, cast, anvil)](https://book.getfoundry.sh/) — installation commands below
* An RPC endpoint for Polygon Amoy (or other target network) and a deployer private key (for testing use only; **do not** commit or share secrets)

---

## Quick install (Foundry)

```bash
# Install Foundry (if you don't have it)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Initialize or clone project
git clone <this-repo-url>
cd batch-erc1155-foundry

# Install OpenZeppelin contracts into lib/
forge install OpenZeppelin/openzeppelin-contracts
```

> If you already ran `forge init`, remove the extra sample files and replace `src/` with the project `src/` above.

---

## Configuration

Create a `.env` file (DO NOT COMMIT). Example:

```env
# .env - local only
PRIVATE_KEY=0xyour_private_key_here
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
AMOY_ALCHEMY_URL=https://polygon-amoy.g.alchemy.com/v2/your-alchemy-key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

Load it in your shell before running commands:

```bash
# load env variables into the shell (POSIX)
export $(grep -v '^#' .env | xargs)
```

**Security note:** Treat `PRIVATE_KEY` as secret. If exposed, rotate immediately and move funds.

---

## Build & Test

```bash
# Clean & build
forge clean
forge build

# Run all tests (Solidity tests)
forge test -v
```

Expected tests include: distribution to EOAs, contract-acceptance tests, owner-only checks, edge-case reverts.

---

## Deploy (Foundry script)

We included `script/DeployBatchMint.s.sol`. Deploy with:

```bash
# Make sure env loaded
export $(grep -v '^#' .env | xargs)

# Deploy to Polygon Amoy (example uses AMOY_ALCHEMY_URL)
forge script script/DeployBatchMint.s.sol:DeployBatchMint \
  --rpc-url "$AMOY_ALCHEMY_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
```

Output will show transaction hash, gas paid and deployed contract address. Save that address.

---

## Interact with the deployed contract

### Via Polygonscan UI (after verification)

* Visit `https://amoy.polygonscan.com/address/<CONTRACT_ADDRESS>#code` → use **Read Contract** and **Write Contract** tabs.
* To call owner-only functions, connect your MetaMask wallet (set to Amoy and owner key).

### Via `cast` (CLI)

Read a balance:

```bash
cast call --rpc-url "$AMOY_ALCHEMY_URL" <CONTRACT_ADDRESS> \
  "balanceOf(address,uint256)(uint256)" 0xRecipientAddress 1
```

Send `mintAndDistributeSameAmount` (example):

```bash
cast send --rpc-url "$AMOY_ALCHEMY_URL" --private-key "$PRIVATE_KEY" \
  <CONTRACT_ADDRESS> \
  "mintAndDistributeSameAmount(address[],uint256)" \
  '["0xrecipient1","0xrecipient2"]' 1
```

> Arrays must be passed as JSON string (see example). Alternatively use a Foundry script (`script/CallMint.s.sol`) and run it with `forge script --broadcast`.

---



## Metadata example (token JSON)

If you use `https://token-cdn-domain/{id}.json` or `ipfs://<CID>/{id}.json`, metadata should be a JSON file per token id (for id = 1):

`1.json`:

```json
{
  "name": "Batch Token #1",
  "description": "Airdrop token distributed via BatchMint1155",
  "image": "ipfs://<IMAGE_CID>/image.png",
  "attributes": []
}
```

Upload to IPFS (Pinata / web3.storage / nft.storage) and use `ipfs://<CID>/{id}.json` as your contract URI.

---

## License

MIT

