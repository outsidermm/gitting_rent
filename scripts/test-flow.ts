/**
 * End-to-end test of the full escrow flow:
 *   1. Create lease (already done via curl — reuse existing lease)
 *   2. EscrowCreate on-chain (tenant signs)
 *   3. confirmEscrow (records sequence)
 *   4. submitEvidence (move-out)
 *   5. approveRefund (notary releases bond)
 *
 * Usage:
 *   pnpm tsx scripts/test-flow.ts [leaseId]
 *
 * If no leaseId is given, a fresh lease is created first.
 */

import { Client, Wallet } from "xrpl";

const BASE = "http://localhost:3001";
const DEVNET_WSS = "wss://s.devnet.rippletest.net:51233";

const LANDLORD_SEED = "sEd7cWqTMLt5m8NhjEahn38cDP1WVnG";
const TENANT_SEED   = "sEdSuKkrAAZekFMsGkpkEfGpsjCLMfC";
const NOTARY_SEED   = "sEdTrfRgbZotn9AJztwc2SyRSmAu2UA";

const LANDLORD = Wallet.fromSeed(LANDLORD_SEED).address;
const TENANT   = Wallet.fromSeed(TENANT_SEED).address;
const NOTARY   = Wallet.fromSeed(NOTARY_SEED).address;

// ── helpers ──────────────────────────────────────────────────────────────────

async function trpcQuery(proc: string, input: unknown) {
  const url = `${BASE}/api/trpc/${proc}?input=${encodeURIComponent(JSON.stringify({ json: input }))}`;
  const res = await fetch(url);
  const body = await res.json() as { result?: { data?: { json?: unknown } }; error?: unknown };
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result!.data!.json;
}

async function trpcMutation(proc: string, input: unknown) {
  const res = await fetch(`${BASE}/api/trpc/${proc}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const body = await res.json() as { result?: { data?: { json?: unknown } }; error?: unknown };
  if (body.error) throw new Error(JSON.stringify(body.error));
  return body.result!.data!.json;
}

function log(step: string, detail?: unknown) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`▶ ${step}`);
  if (detail !== undefined) console.log(JSON.stringify(detail, null, 2));
}

// ── steps ────────────────────────────────────────────────────────────────────

async function createLease(): Promise<string> {
  log("Step 1: Create lease (landlord)");
  const lease = await trpcMutation("lease.create", {
    landlordAddress: LANDLORD,
    tenantAddress: TENANT,
    notaryAddress: NOTARY,
    bondAmountXrp: "5",
    baselineCondition: "Walls freshly painted, carpets clean, all appliances operational.",
    baselinePhotoUrls: [],
  }) as { id: string };
  console.log("  Lease ID:", lease.id);
  return lease.id;
}

async function escrowCreate(leaseId: string, client: Client): Promise<number> {
  log("Step 2: EscrowCreate on-chain (tenant signs in-browser)");

  const { tx } = await trpcQuery("lease.getEscrowCreatePayload", { leaseId }) as { tx: Record<string, unknown> };
  console.log("  Unsigned tx:", JSON.stringify(tx));

  const tenantWallet = Wallet.fromSeed(TENANT_SEED);
  const prepared = await client.autofill(tx as Parameters<typeof client.autofill>[0]);
  console.log("  Sequence:", prepared.Sequence, "| Fee:", prepared.Fee, "| Condition:", (prepared as Record<string, unknown>).Condition);

  const { tx_blob, hash } = tenantWallet.sign(prepared);
  console.log("  Signed hash:", hash);

  const result = await client.submitAndWait(tx_blob);
  const txResult = (result.result.meta as { TransactionResult?: string })?.TransactionResult;
  console.log("  On-chain result:", txResult);

  if (txResult !== "tesSUCCESS") {
    throw new Error(`EscrowCreate failed: ${txResult}\n${JSON.stringify(result.result, null, 2)}`);
  }

  return prepared.Sequence!;
}

async function confirmEscrow(leaseId: string, sequence: number): Promise<void> {
  log("Step 3: Confirm escrow (record sequence in DB)");
  const lease = await trpcMutation("lease.confirmEscrow", {
    leaseId,
    escrowSequence: sequence,
    escrowOwnerAddress: TENANT,
  }) as { status: string };
  console.log("  New status:", lease.status);
}

async function submitEvidence(leaseId: string): Promise<void> {
  log("Step 4: Submit move-out evidence (tenant)");
  const lease = await trpcMutation("lease.submitEvidence", {
    leaseId,
    callerAddress: TENANT,
    exitCondition: "Minor scuff on bedroom wall, otherwise identical to move-in.",
    exitPhotoUrls: [],
  }) as { status: string };
  console.log("  New status:", lease.status);
}

async function approveRefund(leaseId: string, client: Client): Promise<void> {
  log("Step 5: Approve & release bond (notary — client-side signing)");

  const { tx } = await trpcQuery("lease.getEscrowFinishPayload", {
    leaseId,
    callerAddress: NOTARY,
  }) as { tx: Record<string, unknown> };
  console.log("  Unsigned EscrowFinish:", JSON.stringify(tx));

  const notaryWallet = Wallet.fromSeed(NOTARY_SEED);

  // Elevated fee for crypto-condition EscrowFinish
  const fulfillmentHex = tx.Fulfillment as string;
  const fulfillmentBytes = Math.ceil(fulfillmentHex.length / 2);
  const elevatedFee = String(10 * Math.ceil((33 + fulfillmentBytes) / 16));

  const prepared = await client.autofill({ ...tx, Fee: elevatedFee } as Parameters<typeof client.autofill>[0]);
  console.log("  Sequence:", prepared.Sequence, "| Fee:", prepared.Fee);

  const { tx_blob, hash } = notaryWallet.sign(prepared);
  console.log("  Signed hash:", hash);

  const result = await client.submitAndWait(tx_blob);
  const txResult = (result.result.meta as { TransactionResult?: string })?.TransactionResult;
  console.log("  On-chain result:", txResult);

  if (txResult !== "tesSUCCESS") {
    throw new Error(`EscrowFinish failed: ${txResult}`);
  }

  // Confirm with server (update DB status)
  const lease = await trpcMutation("lease.approveRefund", {
    leaseId,
    callerAddress: NOTARY,
  }) as { status: string };
  console.log("  Final status:", lease.status);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Client(DEVNET_WSS);
  await client.connect();
  console.log("Connected to XRPL Devnet");

  try {
    const existingLeaseId = process.argv[2];
    const leaseId = existingLeaseId ?? await createLease();

    const sequence = await escrowCreate(leaseId, client);
    await confirmEscrow(leaseId, sequence);
    await submitEvidence(leaseId);
    await approveRefund(leaseId, client);

    log("COMPLETE ✓ Full flow succeeded!");
  } finally {
    await client.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error("\n✗ Flow failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
