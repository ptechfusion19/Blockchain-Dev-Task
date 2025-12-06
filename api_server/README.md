# Solana Card Buying API Server

Backend API server for interacting with the Solana Card Buying Program (Anchor).

## 📋 Project Structure

```
api_server/
├── src/
│   ├── index.ts              # Main Express server
│   ├── config/
│   │   └── anchor.ts         # Anchor configuration & constants
│   ├── controllers/
│   │   └── cardController.ts # API endpoint handlers
│   ├── routes/
│   │   └── index.ts          # Route definitions
│   ├── utils/
│   │   └── helpers.ts        # Helper functions
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   └── idl/
│       └── user_card_program.ts  # Anchor IDL
├── .env                      # Environment variables
├── package.json              # NPM dependencies
├── tsconfig.json             # TypeScript config
└── Postman_Collection.json   # Postman API tests
```

## 🚀 Quick Start

### 1. Installation

```bash
# Make sure you're in the project root
cd /home/abdullah/my-user-card

# Install all dependencies (if not already done)
npm install

# Build TypeScript
npm run build
```

### 2. Run the Server

**Option A - Development Mode (with auto-reload)**
```bash
cd api_server
npm run dev
```

**Option B - Production Mode**
```bash
cd api_server
npm run build:start
```

The server will start on `http://localhost:3001`

### 3. Verify Server is Running

```bash
curl http://localhost:3001/health
```

## 📚 API Endpoints

### 1. **Health Check**
```
GET /health
```
Check if API server is running.

**Response:**
```json
{
  "status": "OK",
  "message": "Solana Card Buying API Server is running",
  "timestamp": "2024-12-01T05:35:55.157Z"
}
```

---

### 2. **Get API Info**
```
GET /
```
Get all available endpoints.

**Response:**
```json
{
  "message": "Solana Card Buying API Server",
  "version": "1.0.0",
  "endpoints": {
    "health": "GET /health",
    "buyCard": "POST /api/buy-card",
    "getUserCard": "GET /api/user-card",
    "withdrawFunds": "POST /api/withdraw",
    "getAccountBalance": "GET /api/account-balance",
    "estimateTokens": "GET /api/estimate-tokens",
    "verifyAdmin": "GET /api/verify-admin"
  }
}
```

---

### 3. **Estimate Tokens** ✅ Ready to Test
```
GET /api/estimate-tokens?cardType=0&amount=125000000
```
Calculate tokens user will receive for a given card type and amount.

**Query Parameters:**
- `cardType` (0-3): 0=Bronze, 1=Silver, 2=Gold, 3=Platinum
- `amount` (number): Amount in lamports

**Example Request:**
```bash
curl "http://localhost:3001/api/estimate-tokens?cardType=0&amount=125000000"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cardType": "Bronze",
    "amountPaid": 0.125,
    "tokensToMint": 125000000,
    "ratio": "1:1"
  },
  "message": "Token estimate calculated successfully"
}
```

---

### 4. **Verify Admin** ✅ Ready to Test
```
GET /api/verify-admin?adminPubkey=Fskji1sm9H8QwZBGmuRTTie6B111RhCfLtbALMaNRkt
```
Verify if a public key is the admin.

**Query Parameters:**
- `adminPubkey` (string): Public key to verify

**Example Request:**
```bash
curl "http://localhost:3001/api/verify-admin?adminPubkey=Fskji1sm9H8QwZBGmuRTTie6B111RhCfLtbALMaNRkt"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isAdmin": true,
    "expectedAdmin": "Fskji1sm9H8QwZBGmuRTTie6B111RhCfLtbALMaNRkt",
    "providedAdmin": "Fskji1sm9H8QwZBGmuRTTie6B111RhCfLtbALMaNRkt"
  },
  "message": "Valid admin"
}
```

---

### 5. **Get Account Balance** ⚠️ Needs User Setup
```
GET /api/account-balance?userPubkey=YOUR_USER_PUBKEY
```
Get the SOL balance of a user's card account (PDA).

**Query Parameters:**
- `userPubkey` (string): User's public key

**Example Request:**
```bash
curl "http://localhost:3001/api/account-balance?userPubkey=YOUR_USER_PUBKEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "balanceLamports": 125000000,
    "balanceSOL": 0.125,
    "account": "DERIVED_PDA_ADDRESS"
  },
  "message": "Account balance retrieved successfully"
}
```

---

### 6. **Get User Card Data** ⚠️ Needs User Setup
```
GET /api/user-card?userPubkey=YOUR_USER_PUBKEY
```
Get card data for a user (owner, card type, amount paid, tokens minted).

**Query Parameters:**
- `userPubkey` (string): User's public key

**Example Request:**
```bash
curl "http://localhost:3001/api/user-card?userPubkey=YOUR_USER_PUBKEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "owner": "USER_PUBKEY",
    "cardType": 2,
    "amount_paid": 500000000,
    "tokens_minted": 500000000
  },
  "message": "User card retrieved successfully (Type: Gold)"
}
```

---

### 7. **Buy Card** ⚠️ Needs Full Setup
```
POST /api/buy-card
```
User purchases a card and receives tokens.

**Request Body:**
```json
{
  "cardType": 0,
  "amount": 125000000,
  "userPubkey": "YOUR_USER_PUBKEY",
  "userPrivateKey": [YOUR_PRIVATE_KEY_AS_ARRAY],
  "cardMintPubkey": "YOUR_CARD_MINT_PUBKEY",
  "userTokenAccountPubkey": "YOUR_TOKEN_ACCOUNT_PUBKEY"
}
```

**Note:** This requires:
- User's keypair
- SPL Token Mint created
- User's Token Account

---

### 8. **Withdraw Funds** ⚠️ Admin Only
```
POST /api/withdraw
```
Admin withdraws accumulated funds from user card accounts.

**Request Body:**
```json
{
  "amount": 100000000,
  "adminPrivateKey": [YOUR_ADMIN_PRIVATE_KEY_AS_ARRAY],
  "userCardPubkey": "USER_CARD_PDA_PUBKEY"
}
```

**Note:** Only the hardcoded admin can call this endpoint.

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionSignature": "TX_HASH",
    "amount": 0.1,
    "solamountUnit": "SOL"
  },
  "message": "Withdrawal successful: 0.1 SOL transferred to admin"
}
```

---

## 🧪 Testing in Postman

1. **Import Collection:**
   - Open Postman
   - Click `Import`
   - Select `api_server/Postman_Collection.json`

2. **Test Endpoints:**
   - Start with `/health` ✅
   - Test `/api/verify-admin` ✅
   - Test `/api/estimate-tokens` ✅
   - Other endpoints require user setup

---

## 📦 Environment Variables

Create `.env` file in `api_server/` folder:

```env
# Solana Network
SOLANA_RPC_URL=https://api.devnet.solana.com

# Server
PORT=3001
NODE_ENV=development
```

---

## 🔒 Security Notes

- Admin private key should NEVER be exposed in frontend
- Use environment variables for sensitive data
- Validate all inputs on backend
- Use HTTPS in production
- Add authentication/authorization middleware

---

## 📋 Card Prices

| Card Type | Price | Lamports |
|-----------|-------|----------|
| Bronze | 0.125 SOL | 125,000,000 |
| Silver | 0.25 SOL | 250,000,000 |
| Gold | 0.5 SOL | 500,000,000 |
| Platinum | 1 SOL | 1,000,000,000 |

---

## 🐛 Troubleshooting

**Issue: "Cannot find module '@coral-xyz/anchor'"**
```bash
cd /home/abdullah/my-user-card
npm install
```

**Issue: Port 3001 already in use**
```bash
PORT=3002 npm run dev
```

**Issue: Connection refused to RPC**
- Check internet connection
- Verify `SOLANA_RPC_URL` in `.env`

---

## 📖 Next Steps

1. ✅ Server is running
2. Test endpoints with Postman
3. Integrate with frontend
4. Add proper authentication
5. Deploy to production

---

Made with ❤️ for Solana development
