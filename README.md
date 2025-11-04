# four.meme BSC scripts

Node.js scripts to interact with the **[Four.meme](https://four.meme/)** platform on **Binance Smart Chain**.

## Feature

- Simulate token buys/sells using `four-flap-meme-sdk`


## Setup

```bash
npm install
cp .env.example .env
```

Add your RPC URL to `.env`.

## Usage

```bash

# Simulate buy
node scripts/buy.js

# Simulate sell
node scripts/sell.js

```

## Notes

- Uses **ethers.js** + **four-flap-meme-sdk**
- Supports BSC testnet and mainnet

