# XRPfi - 1-Click Yield Maximizer

Maximize yield on XRP via Flare DeFi with a single transaction.

## Quick Start

### 1. Start Backend (Terminal 1)
```bash
cd server
bun run dev
```

On first run, it will:
- Generate XRPL operator wallet (testnet)
- Print the secret key to save

### 2. Start Frontend (Terminal 2)
```bash
cd client
bun run dev
```

Open http://localhost:3000

## Setup

### Backend Environment
Copy `server/.env.example` to `server/.env`:
```
XRPL_NODE_URL=wss://s.altnet.rippletest.net:51233
XRPL_OPERATOR_SECRET=<generated on first run>
FLARE_RPC_URL=https://coston2-api.flare.network/ext/bc/C/rpc
FLARE_OPERATOR_PRIVATE_KEY=<generate with POST /api/generate-wallets>
```

### Fund Wallets
1. **XRPL testnet**: Auto-funded on first run
2. **Flare Coston2**: Get C2FLR from https://faucet.flare.network

## Architecture

```
Frontend (Next.js) → Backend (Hono) → XRPL + Flare
     ↓                    ↓
  GemWallet         FDC Attestation
```

### User Flow
1. Connect GemWallet
2. Select Firelight staking strategy
3. Enter XRP amount
4. Sign payment tx → Backend detects → FDC proof → Flare execution
5. stXRP tokens in Flare Smart Account

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/strategies` | GET | List yield strategies |
| `/api/prepare` | POST | Prepare transaction params |
| `/api/status/:txHash` | GET | Get tx status |
| `/api/holdings/:addr` | GET | Get user holdings |
| `/api/operator` | GET | Get operator info |

## Tech Stack

- **Frontend**: Next.js 16, Tailwind, Zustand, GemWallet API
- **Backend**: Hono, xrpl.js, viem, SQLite, Drizzle ORM
- **Infra**: XRPL Testnet, Flare Coston2, FDC

## Contract Addresses

- MasterAccountController: `0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393`
- Firelight Vault: `0x91Bfe6A68aB035DFebb6A770FFfB748C03C0E40B`
