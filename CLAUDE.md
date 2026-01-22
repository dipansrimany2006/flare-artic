# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Backend (port 3001)
cd server && bun run dev

# Frontend (port 3000)
cd client && bun run dev

# Generate Flare wallet
cd server && bun run generate-wallets

# Lint frontend
cd client && bun run lint
```

## Architecture

XRPfi is a 1-click yield maximizer that bridges XRP from XRPL to Flare DeFi. Users send XRP from XRPL wallet, system auto-bridges to FXRP and deposits into yield strategies via Flare Smart Accounts.

```
Frontend (Next.js) → Backend (Hono) → XRPL + Flare
     ↓                    ↓
  GemWallet         FDC Attestation → MasterAccountController → Smart Account
```

### Core Flow
1. User connects GemWallet, selects strategy, enters XRP amount
2. User signs XRPL Payment tx with encoded instruction memo (32-byte format)
3. Backend detects payment via XRPL WebSocket listener (`server/src/lib/xrpl.ts`)
4. Backend requests FDC (Flare Data Connector) proof (`server/src/lib/fdc.ts`)
5. Backend calls `MasterAccountController.executeTransaction()` on Flare (`server/src/lib/flare.ts`)
6. User's Flare Smart Account receives yield-bearing tokens (stXRP)

### Instruction Encoding (XRPL Memo)
32-byte memo in XRPL payment:
- Byte 0: Instruction code (0x10=Firelight, 0x20=Upshift)
- Byte 1: Wallet ID (0 for independent apps)
- Bytes 2-21: Agent vault address
- Bytes 22-25: Vault ID
- Bytes 26-31: Value in lots

See `server/src/lib/instruction.ts` for encode/decode logic.

### Key Contracts (Coston2 Testnet)
- MasterAccountController: `0x3ab31E2d943d1E8F47B275605E50Ff107f2F8393`
- Firelight Vault: `0x91Bfe6A68aB035DFebb6A770FFfB748C03C0E40B`

### Backend Structure
- `server/src/index.ts` - Hono app entry, initializes XRPL listener
- `server/src/lib/xrpl.ts` - XRPL client, payment listener, wallet mgmt
- `server/src/lib/flare.ts` - Viem client, contract interactions
- `server/src/lib/fdc.ts` - FDC attestation request/proof flow
- `server/src/lib/executor.ts` - Orchestrates FDC proof + Flare execution
- `server/src/lib/instruction.ts` - Memo encoding/decoding
- `server/src/routes/` - API endpoints (strategies, prepare, status, holdings)

### Frontend Structure
- `client/src/store/wallet.ts` - Zustand store for wallet/flow state
- `client/src/lib/gemwallet.ts` - GemWallet API integration
- `client/src/lib/api.ts` - Backend API client
- `client/src/components/` - React components for each flow step
