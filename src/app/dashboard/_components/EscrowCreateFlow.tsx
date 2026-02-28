"use client";

/**
 * EscrowCreateFlow
 *
 * Signs and submits TWO EscrowCreate transactions for the tenant:
 *
 *   1. Penalty escrow  — Destination = landlord
 *      Settled by the notary if the exit condition is rated "Poor".
 *
 *   2. Refund escrow   — Destination = tenant
 *      Settled by the notary if the exit condition is rated Excellent/Good/Fair.
 *
 * Both use independent PREIMAGE-SHA-256 conditions generated server-side.
 * The notary only receives the relevant fulfillment after they select a verdict,
 * so neither escrow can be settled without the notary's explicit decision.
 *
 * Unsigned tx templates come from the server (tRPC); autofill + sign +
 * submitAndWait run client-side so account sequences are always fresh.
 */

import { useState } from "react";
import { Wallet, Client, dropsToXrp } from "xrpl";
import type { EscrowCreate } from "xrpl";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { Row } from "~/app/ui/row";
import { DEVNET_WSS } from "~/app/constants";

type Step = "review" | "processing" | "done";

interface EscrowCreateFlowProps {
  leaseId: string;
  onSuccess: () => void;
}

export function EscrowCreateFlow({
  leaseId,
  onSuccess,
}: EscrowCreateFlowProps) {
  const { seed, address } = useWallet();
  const [step, setStep] = useState<Step>("review");
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");
  const [txHashes, setTxHashes] = useState<{
    penalty: string;
    refund: string;
  } | null>(null);

  const {
    data,
    isLoading,
    error: queryError,
  } = api.lease.getEscrowCreatePayload.useQuery({ leaseId }, { retry: false });

  const confirmEscrow = api.lease.confirmEscrow.useMutation({
    onSuccess,
    onError: () =>
      setError(
        "Your deposits were placed on-chain but we could not update the lease. Please refresh and check your lease status.",
      ),
  });

  async function signAndSubmitBoth() {
    if (!seed || !data) return;
    setStep("processing");
    setError("");

    let client: Client | null = null;

    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      // ── 1. Penalty escrow (Destination = landlord) ─────────────────────────
      setProgressLabel("Submitting penalty escrow (1/2)…");
      const penaltyTx = data.txPenalty as EscrowCreate;
      const penaltyPrepared = await client.autofill(penaltyTx);
      const { tx_blob: penaltyBlob, hash: penaltyHash } =
        wallet.sign(penaltyPrepared);

      setProgressLabel("Confirming penalty escrow (1/2)…");
      const penaltyResult = await client.submitAndWait(penaltyBlob);
      const penaltyMeta = penaltyResult.result.meta as
        | { TransactionResult?: string }
        | undefined;
      if (penaltyMeta?.TransactionResult !== "tesSUCCESS") {
        throw new Error(
          "Penalty escrow could not be placed. Please try again.",
        );
      }
      const penaltySequence = penaltyPrepared.Sequence!;

      // ── 2. Refund escrow (Destination = tenant) ─────────────────────────────
      setProgressLabel("Submitting refund escrow (2/2)…");
      const refundTx = data.txRefund as EscrowCreate;
      const refundPrepared = await client.autofill(refundTx);
      const { tx_blob: refundBlob, hash: refundHash } =
        wallet.sign(refundPrepared);

      setProgressLabel("Confirming refund escrow (2/2)…");
      const refundResult = await client.submitAndWait(refundBlob);
      const refundMeta = refundResult.result.meta as
        | { TransactionResult?: string }
        | undefined;
      if (refundMeta?.TransactionResult !== "tesSUCCESS") {
        throw new Error("Refund escrow could not be placed. Please try again.");
      }
      const refundSequence = refundPrepared.Sequence!;

      await client.disconnect();
      client = null;

      setTxHashes({ penalty: penaltyHash, refund: refundHash });

      confirmEscrow.mutate({
        leaseId,
        escrowSequence: penaltySequence,
        refundEscrowSequence: refundSequence,
        escrowOwnerAddress: address!,
      });

      setStep("done");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      setError(msg);
      setStep("review");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading escrow details…</p>;
  }

  if (queryError ?? !data) {
    return (
      <p className="text-sm text-red-400">
        Unable to load deposit details. Please refresh and try again.
      </p>
    );
  }

  const xrpAmount = dropsToXrp(data.lease.bondAmountDrops);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-blue-300">Deposit Bond</h4>

      {step === "done" ? (
        <div className="space-y-3">
          <p className="text-sm text-green-400">
            ✓ Both escrows created on-chain!
          </p>
          <div className="space-y-1 rounded-lg bg-neutral-800/40 p-3 text-xs">
            <p className="text-neutral-500">
              The bond is now locked. The notary will settle the correct escrow
              based on the exit condition.
            </p>
            {txHashes && (
              <div className="mt-2 space-y-1">
                <p className="font-mono break-all text-neutral-600">
                  penalty: {txHashes.penalty}
                </p>
                <p className="font-mono break-all text-neutral-600">
                  refund: {txHashes.refund}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="space-y-1 text-sm">
            <Row label="Bond amount" value={`${xrpAmount} XRP`} />
            <Row
              label="Landlord"
              value={`${data.lease.landlordAddress.slice(0, 14)}…`}
              mono
            />
            <Row
              label="Refund destination"
              value="You (if condition is acceptable)"
            />
            <Row
              label="Penalty destination"
              value="Landlord (if condition is Poor)"
            />
            <Row label="Cancellation" value="Available after 1 minute" />
          </div>

          <div className="rounded-lg border border-blue-900/30 bg-blue-950/20 px-3 py-2 text-xs text-blue-300">
            Two escrows will be created — the notary decides which one to settle
            after reviewing your move-out evidence.
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-xs whitespace-pre-wrap text-red-400">
              {error}
            </p>
          )}

          {!seed ? (
            <p className="text-xs text-red-400">
              Wallet seed unavailable — please disconnect and reconnect.
            </p>
          ) : (
            <button
              onClick={() => void signAndSubmitBoth()}
              disabled={step !== "review"}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              {step === "review" && "Sign & Lock Bond"}
              {step === "processing" && (progressLabel || "Processing…")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
