# Smart Bond Return (A Decentralized Rental Deposit Protocol)

## The Problem
Managing rental security deposits relies on centralized holding accounts, physical paperwork, and slow manual bank transfers. Disputes over final property conditions cause severe bottlenecks, administrative overhead, and delayed refunds for tenants. 

## The XRPL Solution
An automated "Smart Bond Return" system utilizing XRPL Smart Escrows (XLS-100) and a multi-role decentralized application. The system eliminates centralized custody by locking a tenant's security deposit in an RLUSD smart escrow. 

The platform supports three distinct user roles: **Landlord**, **Tenant**, and **Notary** (Auditor). A single user can play any of these roles across different transactions. Upon move-out, an independent Notary reviews the final condition. Once approved, the Notary provides cryptographic authorization, triggering the escrow's custom logic to instantly release the bond directly to the tenant's wallet.

---

## 1. System Architecture (The T3 Stack + XRPL)
The application relies on the T3 Stack (`create-t3-app`) for a rapid, fully type-safe development environment.
* **Frontend**: Next.js (React), Tailwind CSS, and lightweight wallet connection hooks. The UI is heavily minimalistic to allow seamless switching between Landlord, Tenant, and Notary views.
* **Backend**: tRPC (TypeScript Remote Procedure Call). tRPC allows the frontend to call backend server functions directly with full TypeScript type safety.
* **Database**: Prisma ORM with a lightweight PostgreSQL database to store off-chain lease metadata, condition requirements, and photo URIs.
* **Layer-1 Network**: XRPL Testnet/Devnet utilizing the XLS-100 Smart Escrow amendment and standard `xrpl.js` API integration.

## 2. XRPL Layer-1 Logic (Smart Escrow & Validation)
Instead of relying on a centralized database to hold funds, the application utilizes XRPL's native Smart Escrows.
* **The Notary Pattern**: The Smart Escrow is configured as a "Notary Escrow". A small WebAssembly (WASM) script checks the release condition.
* **Release Condition**: The WASM code is programmed to read the `EscrowFinish` transaction. If the transaction contains a valid cryptographic signature from the designated "Notary" wallet address linked to the lease, it returns `true` and releases the RLUSD to the Tenant's destination wallet.
* **XRPL Tooling**: Implementation relies on `xrpl.js` (referencing standard XRPL API flows) connected to `wss://s.devnet.rippletest.net:51233` for development.

## 3. Backend Requirements (tRPC & Database)
The backend acts as a secure coordinator for off-chain state and transaction preparation.
* **Lease Initialization**: Landlords can submit a new lease transaction. The DB records the Landlord wallet, Tenant (Destination) wallet, current house condition (photos/text), and required exit condition.
* **Evidence Handling**: A tRPC mutation allows Tenants to upload move-out photos and complete condition dropdowns, linking these to the specific lease ID.
* **Transaction Construction**: When the Notary approves the condition, the backend constructs the `EscrowFinish` payload for the Notary to sign via their connected wallet.

## 4. Frontend Requirements (Next.js & Tailwind)
The frontend provides a frictionless, minimalistic user experience. A unified dashboard allows users to easily toggle their active role.
* **Authentication**: Simple "Connect Wallet" functionality.
* **Unified Dashboard - Minimalistic Role Switching**:
    * **Landlord View**: Create a new lease transaction (link tenant wallet, set deposit amount, upload baseline condition). View active properties and bond statuses.
    * **Tenant View**: View active lease requests. A "Deposit Bond" button to construct and sign the `EscrowCreate` transaction. A "Move Out" flow to upload final photos and fill out the condition dropdown.
    * **Notary View**: A feed of pending move-out audits. View side-by-side baseline and exit photos/dropdowns. An "Approve" button that prompts their wallet to sign the `EscrowFinish` transaction.
* **Real-Time State Updates**: Utilize WebSocket subscriptions (`xrpl.Client` 'transaction' events) to listen for the `EscrowFinish` ledger close, updating the UI instantly upon successful refund.

## 5. Step-by-Step Execution Flow
1.  **Initiation**: The Landlord creates a lease on the app, linking the Tenant's destination wallet, setting the bond amount, and stating the baseline conditions.
2.  **Locking**: The Tenant connects their wallet, reviews the terms, and signs an `EscrowCreate` transaction, locking the required RLUSD on the XRPL Devnet.
3.  **Move Out**: At lease end, the Tenant uploads exit photos and selects the property condition via dropdowns.
4.  **Audit**: A designated Notary logs in, navigates to the Notary tab, and reviews the submitted evidence against the Landlord's requirements.
5.  **Settlement**: The Notary clicks "Approve" and signs the `EscrowFinish` transaction. The XRPL verifies the Notary's signature and autonomously releases the funds to the Tenant's wallet.