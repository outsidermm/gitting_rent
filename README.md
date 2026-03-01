# Smart Bond Return

> **Trustless rental deposits on the XRP Ledger — no lawyers, no delays, no disputes.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-gitting--rent.vercel.app-6366f1?style=for-the-badge&logo=vercel)](https://gitting-rent.vercel.app)
[![XRPL Devnet](https://img.shields.io/badge/XRPL-Devnet-00adef?style=for-the-badge)](https://devnet.xrpl.org)
[![Built with T3](https://img.shields.io/badge/Built%20with-T3%20Stack-7c3aed?style=for-the-badge)](https://create.t3.gg)
[![XLS-100](https://img.shields.io/badge/XLS--100-Smart%20Escrow-f59e0b?style=for-the-badge)](https://github.com/XRPLF/XRPL-Standards)

---

## The Problem

Every renter knows the feeling: you hand over a security deposit and cross your fingers you'll see it again. Landlords hold funds in personal accounts. Disputes over property condition drag on for weeks. Bank transfers take days. The whole system runs on trust — which is exactly why it keeps breaking.

**Smart Bond Return replaces trust with code.**

---

## How It Works

Three parties, zero intermediaries. A tenant's bond is locked on-chain the moment they sign, and released automatically the moment a notary approves — all without touching a bank or a lawyer.

```
Landlord                Tenant                 Notary (Auditor)
   │                      │                         │
   │  1. Create Lease      │                         │
   │─────────────────────►│                         │
   │                      │                         │
   │                      │  2. Lock Bond On-Chain  │
   │                      │  (Two XRPL Escrows)     │
   │                      │─────────────────────────│
   │                      │                         │
   │                      │  3. Submit Move-Out      │
   │                      │  Evidence + Photos      │
   │                      │────────────────────────►│
   │                      │                         │
   │                      │                         │  4. Review & Verdict
   │                      │◄────────────────────────│  ✓ Condition OK  → Bond → Tenant
   │◄─────────────────────│─────────────────────────│  ✗ Condition Poor → Bond → Landlord
```

---

## Three Roles, One Dashboard

Users connect their XRPL wallet and switch between any role they hold across their leases.

### 🏠 Landlord
- Creates a lease: links tenant + notary wallet addresses, sets bond amount, documents baseline property condition with photos and a written description
- Monitors bond status in real time — no chasing banks

### 🔑 Tenant
- Reviews lease terms and locks the bond on-chain with a single click
- Submits move-out evidence (photos + condition rating) when ready to leave
- If the notary rules in their favour: bond returns to their wallet automatically
- If not: the unused "refund" escrow can be cancelled back after the lock period expires

### ⚖️ Notary
- Reviews side-by-side baseline vs. exit evidence submitted by the tenant
- Selects a verdict: **Refund** (condition acceptable) or **Penalty** (condition poor)
- Signs a single `EscrowFinish` transaction — the funds move instantly, on-chain

---

## The Dual-Escrow Design

This is the core innovation. XRPL escrow destinations are fixed at creation time — you can't change where the money goes after the fact. So we create **two escrows simultaneously** when the tenant deposits:

| Escrow | Destination | Settled When |
|--------|------------|--------------|
| **Penalty** | Landlord's wallet | Notary rules condition is "Poor" |
| **Refund** | Tenant's own wallet | Notary rules condition is OK |

The notary selects a verdict. The server releases the cryptographic fulfillment for the matching escrow. The other escrow expires after a short lock period and can be cancelled by the tenant — no funds ever get stuck.

```
Tenant signs two EscrowCreate txs
         │
         ├── Penalty Escrow ──► Destination: Landlord
         │                      Released if: Notary signs penalty verdict
         │
         └── Refund Escrow  ──► Destination: Tenant
                                Released if: Notary signs refund verdict

Unused escrow expires → Tenant cancels via EscrowCancel
```

---

## XRPL Smart Escrow (XLS-100 WASM)

The settlement logic lives in a **Rust-compiled WebAssembly module** deployed directly on the XRP Ledger via the XLS-100 Smart Escrow amendment — no server involved at the moment of settlement.

The WASM is compiled with two things baked in at build time:
- The **notary's XRPL address** — only that specific wallet can trigger settlement
- The **verdict** (`refund` or `penalty`) — the WASM emits this as an on-chain trace

Settlement flow:
1. Notary clicks "Sign & Settle" in the UI
2. Browser constructs and signs an `EscrowFinish` transaction
3. XRPL runs the WASM: checks that the signer matches the embedded notary address
4. If it matches → escrow releases to its destination
5. On-chain trace records the verdict permanently

The **PREIMAGE-SHA-256 fulfillment** (the cryptographic key that unlocks the escrow) is generated server-side and never sent to the client until the notary is verified and a verdict is chosen.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), Tailwind CSS 4 |
| API | tRPC with end-to-end TypeScript types |
| Database | Prisma 7 + PostgreSQL (lease metadata, condition records) |
| Blockchain | XRPL Devnet via `xrpl.js` v4 |
| Smart Contract | Rust → WASM (XLS-100 Smart Escrow) |
| Deployment | Vercel + Prisma Postgres |

**Security model:** The wallet seed never leaves the browser. All XRPL signing happens client-side using `xrpl.js`. The server only ever sees addresses and transaction results.

---

## Running Locally

```bash
# Clone and install
git clone https://github.com/your-org/gitting-rent
cd gitting-rent
pnpm install

# Set up environment
cp .env.example .env
# Add your DATABASE_URL and other vars

# Set up the database
pnpm prisma db push

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Connect an XRPL Devnet wallet to get started. You can fund a test wallet at the [XRPL Faucet](https://faucet.altnet.rippletest.net/accounts).

---

## Building the WASM Contract

```bash
# Build for a refund verdict (bond → tenant)
pnpm tsx scripts/build-notary-wasm.ts --address rNotaryAddress123 --verdict refund

# Build for a penalty verdict (bond → landlord)
pnpm tsx scripts/build-notary-wasm.ts --address rNotaryAddress123 --verdict penalty
```

Requires the Rust toolchain with `wasm32-unknown-unknown` target.

---

## Built for the XRPL Hackathon

Smart Bond Return demonstrates what becomes possible when financial agreements live entirely on-chain:

- **No custody risk** — funds are locked in an XRPL escrow, not a company bank account
- **No delay** — settlement is instant the moment the notary signs
- **No ambiguity** — the verdict and outcome are recorded permanently on the ledger
- **No trust required** — the code enforces the agreement, not a third party

The dual-escrow pattern and on-chain WASM verdict are novel primitives that could extend to any domain requiring conditional, multi-outcome fund release: insurance payouts, freelance escrow, real estate settlements, and more.
