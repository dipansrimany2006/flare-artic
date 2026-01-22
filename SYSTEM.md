# XRPfi 1-Click Yield Maximizer

A simple solution that enables XRPL users to maximize yield on Flare with a single transaction. Users send XRP from their XRPL wallet, and the system automatically bridges it to FXRP and deposits it into the highest-yield strategy—all without needing a Flare wallet or FLR tokens.

---

## Problem Statement

- XRP holders have limited yield opportunities on XRPL
- Existing DeFi solutions require multiple steps: bridge → swap → stake → manage
- Users need to hold FLR tokens for gas fees on Flare
- Technical complexity prevents mainstream adoption

---

## Solution

A 1-click experience powered by Flare Smart Accounts:

1. User connects XRPL wallet
2. User selects yield strategy and amount
3. User signs one XRP Payment transaction
4. System handles everything else automatically
5. User's Flare Smart Account holds yield-bearing tokens

---

## How Flare Smart Accounts Work

Flare Smart Accounts is an account abstraction system that allows XRPL users to perform actions on Flare without owning FLR tokens.

### Key Components

| Component                      | Description                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------- |
| **MasterAccountController**    | Smart contract on Flare that verifies XRPL payment proofs and routes instructions |
| **User Smart Account**         | Auto-created contract on Flare, controlled exclusively by user's XRPL address     |
| **Flare Data Connector (FDC)** | Protocol that provides cryptographic proof of XRPL transactions                   |
| **Operator**                   | Backend service that bridges XRPL payments to Flare execution                     |

### Flow

```
XRPL Payment → Operator detects → FDC proves → MasterAccountController verifies → Smart Account executes
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│                       (Next.js App)                         │
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│   │ Connect  │ →  |Select    |→   |Sign      │              │
│   │ Wallet   │    │ Strategy │    │ Payment  │              │
│   └──────────┘    └──────────┘    └──────────┘              │
│                                                             │
│   Displays: Strategy options, APY, holdings, tx status      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ XRPL Payment with memo
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        XRP LEDGER                           │
│                                                             │
│   User sends Payment to Operator's XRPL address             │
│   Memo contains encoded instruction (bytes32)               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OPERATOR BACKEND                         │
│                                                             │
│   1. Monitor XRPL address for payments                      │
│   2. Request Payment attestation from FDC                   │
│   3. Call MasterAccountController.executeTransaction()      │
│   4. Pay FLR gas fees                                       │
│   5. Track and report status                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLARE BLOCKCHAIN                         │
│                                                             │
│   MasterAccountController                                   │
│     ├── Verifies FDC proof                                  │
│     ├── Creates Smart Account (if new user)                 │
│     └── Executes instruction on user's Smart Account        │
│                                                             │
│   User's Smart Account                                      │
│     ├── Mints FXRP via FAssets                              │
│     ├── Deposits to Firelight or Upshift                    │
│     └── Holds: FXRP, stXRP, earnXRP                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Yield Strategies (MVP)

### Strategy 1: Firelight Staking

| Attribute      | Value                                    |
| -------------- | ---------------------------------------- |
| Flow           | XRP → FXRP → stXRP                       |
| Token Received | stXRP (liquid staking token)             |
| Yield Source   | DeFi cover fees, Firelight Points        |
| Risk Level     | Low                                      |
| Liquidity      | stXRP is liquid and usable in other DeFi |

### Strategy 2: Upshift Vault (earnXRP)

| Attribute      | Value                                  |
| -------------- | -------------------------------------- |
| Flow           | XRP → FXRP → earnXRP                   |
| Token Received | earnXRP (vault share token)            |
| Yield Source   | Carry trades, AMM liquidity, Firelight |
| Expected APY   | 4-10%                                  |
| Risk Level     | Medium                                 |

---

## Instruction Encoding

The XRPL Payment memo contains a bytes32 value encoding the instruction.

### Byte Layout

| Byte | Content                                    |
| ---- | ------------------------------------------ |
| 0    | Instruction code (Type ID + Command ID)    |
| 1    | Wallet identifier (0 for independent apps) |
| 2-31 | Instruction parameters                     |

### Instruction Code Breakdown

Byte 0 is split into two nibbles:

- High nibble: Type ID (0 = FXRP, 1 = Firelight, 2 = Upshift)
- Low nibble: Command ID

### MVP Instructions

| Code | Type      | Command                         | Description                    |
| ---- | --------- | ------------------------------- | ------------------------------ |
| 0x10 | Firelight | collateralReservationAndDeposit | Mint FXRP + stake in Firelight |
| 0x20 | Upshift   | collateralReservationAndDeposit | Mint FXRP + deposit to Upshift |

### Parameter Encoding

For collateralReservationAndDeposit:

- Bytes 2-21: agentVaultId (address of FAssets agent)
- Bytes 22-25: vaultId (Firelight/Upshift vault identifier)
- Bytes 26-31: value (amount in lots)

---

## Component Details

### Frontend

**Purpose**: User interface for wallet connection, strategy selection, and transaction signing.

**Key Features**:

- XRPL wallet connection (Xaman, GemWallet, Crossmark)
- Strategy comparison with APY display
- Amount input with XRP balance check
- Memo construction for selected strategy
- Transaction status tracking
- Portfolio/holdings view

**Tech Stack**:

- Next.js (App Router)
- Tailwind CSS
- xrpl.js for XRPL interaction
- Xaman SDK / GemWallet API for wallet connection

### Operator Backend

**Purpose**: Bridge between XRPL and Flare, handles all cross-chain complexity.

**Responsibilities**:

1. **XRPL Listener**
   - WebSocket connection to XRPL
   - Monitor designated operator address
   - Parse incoming payments and memos

2. **FDC Integration**
   - Request Payment attestation
   - Wait for proof finalization
   - Handle attestation failures/retries

3. **Flare Executor**
   - Call MasterAccountController.executeTransaction()
   - Manage operator wallet (FLR for gas)
   - Handle transaction failures/retries

4. **Status Tracking**
   - Store transaction state in database
   - Provide API for frontend status queries
   - Emit webhooks on status changes

**Tech Stack**:

- Node.js
- xrpl.js (XRPL WebSocket)
- viem or ethers.js (Flare interaction)
- PostgreSQL (transaction tracking)
- Redis + BullMQ (job queue)

### Database

**Tables**:

1. **transactions**
   - xrpl_tx_hash (unique)
   - xrpl_address
   - xrp_amount
   - instruction_type
   - status (pending → proving → executing → completed/failed)
   - flare_smart_account
   - flare_tx_hash
   - error_message
   - timestamps

2. **operator_config**
   - xrpl_address
   - flare_wallet_address
   - supported_strategies

---

## User Journey

### First-Time User

1. Opens app
2. Clicks "Connect Wallet"
3. Scans QR with Xaman (or connects GemWallet)
4. Sees available strategies with APY
5. Selects "Firelight Staking"
6. Enters amount: 100 XRP
7. Reviews summary (fees, expected outcome)
8. Clicks "Stake Now"
9. Signs transaction in Xaman
10. Sees processing status
11. After ~2-5 minutes: "Success! You now have stXRP"
12. Can view holdings in dashboard

### Returning User

1. Opens app
2. Connects wallet
3. Sees existing holdings (stXRP, earnXRP)
4. Can add more or withdraw

---

## Fee Structure

| Fee Type                   | Paid By                | Description                        |
| -------------------------- | ---------------------- | ---------------------------------- |
| XRPL transaction fee       | User                   | ~0.00001 XRP (negligible)          |
| FAssets minting fee        | User (from XRP amount) | Set by agent, typically 0.1-0.25%  |
| Collateral reservation fee | User (from XRP amount) | Paid in equivalent value           |
| Flare gas fees             | Operator               | Subsidized or recovered via spread |

### Operator Revenue Model Options

1. **Spread on exchange rate**: Take small % of XRP amount
2. **Premium strategies**: Higher APY tiers with fees
3. **Withdrawal fees**: Small fee on exit
4. **Points/rewards sharing**: Take cut of protocol incentives

---

## Security Considerations

### Operator Security

- Operator XRPL address holds received XRP temporarily (until FAssets minting)
- Operator Flare wallet needs FLR for gas
- Private keys must be secured (HSM recommended for production)
- Rate limiting to prevent spam

### User Security

- Users never share private keys
- Smart Account controlled only by user's XRPL address
- Funds are non-custodial once in Smart Account
- FDC proof ensures only legitimate payments are processed

### Smart Contract Security

- MasterAccountController is deployed by Flare Foundation
- Firelight and Upshift are audited protocols
- FAssets system is over-collateralized

---

## External Dependencies

| Dependency       | Provider                    | Fallback                          |
| ---------------- | --------------------------- | --------------------------------- |
| XRPL Node        | Public nodes or self-hosted | Multiple node providers           |
| Flare RPC        | flare-api.flare.network     | Ankr, self-hosted                 |
| FDC Attestations | Flare Data Connector        | No fallback (core infrastructure) |
| FAssets Agents   | Multiple registered agents  | Agent selection logic             |
| Firelight        | firelight.finance           | N/A                               |
| Upshift          | upshift.finance             | N/A                               |

---

## MVP Scope

### In Scope

- XRPL wallet connection (Xaman priority)
- Single strategy: Firelight staking (0x10 instruction)
- Basic operator backend
- Transaction status tracking
- Simple holdings display

### Out of Scope (Post-MVP)

- Multiple yield strategies
- Withdrawal flow
- Strategy comparison/optimization
- Mobile app
- Notifications
- Advanced analytics
- Multi-language support

---

## Success Metrics

| Metric                    | Target (MVP) |
| ------------------------- | ------------ |
| Time from click to stXRP  | < 5 minutes  |
| Transaction success rate  | > 95%        |
| User drop-off during flow | < 30%        |
| Total XRP processed       | Track growth |

---

## Risks and Mitigations

| Risk                        | Impact                 | Mitigation                                |
| --------------------------- | ---------------------- | ----------------------------------------- |
| FDC attestation delays      | Slow UX                | Set expectations, show progress           |
| No available FAssets agents | Cannot mint            | Monitor agent availability, alert         |
| Flare gas price spikes      | Operator cost increase | Gas price limits, pass to user if extreme |
| Smart contract bugs         | Loss of funds          | Use audited contracts only                |
| Operator downtime           | Transactions stuck     | Queue system, monitoring, alerts          |

---

## Development Phases

### Phase 1: MVP (4-6 weeks)

- Frontend with Xaman connection
- Basic operator backend
- Firelight staking only
- Manual monitoring

### Phase 2: Stability (2-4 weeks)

- Error handling improvements
- Retry mechanisms
- Monitoring and alerts
- User feedback integration

### Phase 3: Features (4-6 weeks)

- Upshift strategy
- Withdrawal flows
- Holdings dashboard
- Multiple wallet support

---

## API Contracts

### Frontend to Backend

**Prepare Transaction**

- Endpoint: POST /api/prepare
- Input: xrplAddress, strategy, amountXRP
- Output: destinationAddress, memo, amountDrops, estimatedFees

**Check Status**

- Endpoint: GET /api/status/{xrplTxHash}
- Output: status, flareSmartAccount, flareTxHash, holdings, error

**Get Holdings**

- Endpoint: GET /api/holdings/{xrplAddress}
- Output: fxrpBalance, stXrpBalance, earnXrpBalance, totalValueXRP

**Get Strategies**

- Endpoint: GET /api/strategies
- Output: Array of { id, name, apy, risk, description, enabled }

---

## Environment Configuration

### Frontend

- NEXT_PUBLIC_API_URL: Backend API endpoint
- NEXT_PUBLIC_XAMAN_API_KEY: Xaman SDK key

### Backend

- XRPL_NODE_URL: WebSocket endpoint for XRPL
- XRPL_OPERATOR_ADDRESS: Address to receive payments
- XRPL_OPERATOR_SECRET: Private key (secure storage)
- FLARE_RPC_URL: Flare network RPC
- FLARE_OPERATOR_PRIVATE_KEY: For gas payments (secure storage)
- MASTER_ACCOUNT_CONTROLLER_ADDRESS: Flare contract address
- DATABASE_URL: PostgreSQL connection string
- REDIS_URL: Redis connection string

---

## References

- Flare Smart Accounts: https://dev.flare.network/smart-accounts/overview
- FAssets Documentation: https://dev.flare.network/fassets/overview
- Firelight: https://firelight.finance
- Upshift: https://upshift.finance
- XRPfi Portal: https://xrpfi.flare.network
- Flare Data Connector: https://dev.flare.network/fdc/overview
- Xaman SDK: https://docs.xaman.dev
