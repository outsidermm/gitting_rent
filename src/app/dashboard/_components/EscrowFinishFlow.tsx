"use client";

/**
 * EscrowFinishFlow
 *
 * Allows the notary to choose a verdict and settle the matching escrow:
 *
 *   Refund  → EscrowFinish on the refund escrow (Destination = tenant)
 *             Used when the exit condition is Excellent, Good, or Fair.
 *
 *   Penalty → EscrowFinish on the penalty escrow (Destination = landlord)
 *             Used when the exit condition is rated Poor.
 *
 * The verdict is pre-suggested based on the tenant's submitted exit condition,
 * but the notary must confirm explicitly before any transaction is signed.
 * The unsigned tx (including the fulfillment secret) is only fetched after the
 * notary selects a verdict, so neither fulfillment is unnecessarily exposed.
 */

import { useState } from "react";
import { Wallet, Client, dropsToXrp } from "xrpl";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { DEVNET_WSS } from "~/app/constants";
import type { Step } from "~/types/step";

type Verdict = "refund" | "penalty";

interface EscrowFinishFlowProps {
  leaseId: string;
  /** The tenant's submitted exit condition text, used to pre-suggest the verdict. */
  exitCondition: string;
  onSuccess: () => void;
}

export function EscrowFinishFlow({
  leaseId,
  exitCondition,
  onSuccess,
}: EscrowFinishFlowProps) {
  const { seed, address } = useWallet();

  // Pre-suggest penalty if the exit condition is explicitly rated "Poor"
  const isPoorCondition = exitCondition.startsWith("Poor");
  const suggestedVerdict: Verdict = isPoorCondition ? "penalty" : "refund";

  const [chosenVerdict, setChosenVerdict] = useState<Verdict | null>(null);
  const [step, setStep] = useState<Step>("review");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const {
    data,
    isLoading,
    error: queryError,
  } = api.lease.getEscrowFinishPayload.useQuery(
    { leaseId, callerAddress: address!, verdict: chosenVerdict ?? "refund" },
    { enabled: !!address && !!chosenVerdict, retry: false },
  );

  const approveRefund = api.lease.approveRefund.useMutation({
    onSuccess,
    onError: () =>
      setError(
        "The bond was released on-chain but we could not update the lease. Please refresh and check the lease status.",
      ),
  });

  async function signAndSubmit() {
    if (!seed || !data || !chosenVerdict) return;
    setStep("signing");
    setError("");

    let client: Client | null = null;

    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      const partialTx = data.tx;

      // Elevated fee required for crypto-condition EscrowFinish
      const fulfillmentBytes = Math.ceil(partialTx.Fulfillment!.length / 2);
      const elevatedFee = String(10 * Math.ceil((33 + fulfillmentBytes) / 16));

      const prepared = await client.autofill({ ...partialTx, Fee: elevatedFee });
      const { tx_blob, hash } = wallet.sign(prepared);
      setStep("confirming");

      const result = await client.submitAndWait(tx_blob);
      const meta = result.result.meta as { TransactionResult?: string } | undefined;
      const txResult = meta?.TransactionResult;

      if (txResult !== "tesSUCCESS") {
        throw new Error("The bond release could not be completed. Please try again.");
      }

      setTxHash(hash);
      await client.disconnect();
      client = null;

      approveRefund.mutate({ leaseId, callerAddress: address!, verdict: chosenVerdict });
      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      setError(msg);
      setStep("review");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

  // ── verdict selection ────────────────────────────────────────────────────────

  if (!chosenVerdict) {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-neutral-200">Select Verdict</h4>
          <p className="mt-0.5 text-xs text-neutral-500">
            Choose how to settle the escrow based on the exit condition.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Refund option */}
          <button
            onClick={() => setChosenVerdict("refund")}
            className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition ${
              suggestedVerdict === "refund"
                ? "border-green-700/60 bg-green-900/20 ring-1 ring-green-700/40"
                : "border-neutral-700 bg-neutral-800/40 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
              <span className="text-sm font-semibold text-green-400">Approve Refund</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              Bond returned to tenant. Use when exit condition is Excellent, Good, or Fair.
            </p>
            {suggestedVerdict === "refund" && (
              <span className="mt-1 self-start rounded bg-green-900/40 px-1.5 py-0.5 text-[10px] font-medium text-green-400">
                Suggested
              </span>
            )}
          </button>

          {/* Penalty option */}
          <button
            onClick={() => setChosenVerdict("penalty")}
            className={`flex flex-col gap-1.5 rounded-xl border p-4 text-left transition ${
              suggestedVerdict === "penalty"
                ? "border-red-700/60 bg-red-900/20 ring-1 ring-red-700/40"
                : "border-neutral-700 bg-neutral-800/40 hover:border-neutral-600"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <span className="text-sm font-semibold text-red-400">Claim for Landlord</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-400">
              Bond sent to landlord. Use when exit condition is rated Poor.
            </p>
            {suggestedVerdict === "penalty" && (
              <span className="mt-1 self-start rounded bg-red-900/40 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                Suggested
              </span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── escrow details + sign ────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading escrow details…</p>;
  }

  if (queryError ?? !data) {
    return (
      <p className="text-sm text-red-400">
        Unable to load release details. Please refresh and try again.
      </p>
    );
  }

  const xrpAmount = dropsToXrp(data.lease.bondAmountDrops);
  const isRefund = chosenVerdict === "refund";

  return (
    <div className="space-y-4">
      {/* Verdict header */}
      <div className="flex items-center justify-between">
        <h4 className={`font-medium ${isRefund ? "text-green-300" : "text-red-300"}`}>
          {isRefund ? "Approve Refund to Tenant" : "Claim Bond for Landlord"}
        </h4>
        <button
          onClick={() => { setChosenVerdict(null); setStep("review"); setError(""); }}
          className="text-xs text-neutral-500 hover:text-neutral-300"
        >
          ← Change
        </button>
      </div>

      {step === "done" ? (
        <div className="space-y-2">
          <p className={`text-sm ${isRefund ? "text-green-400" : "text-orange-400"}`}>
            {isRefund
              ? "✓ Bond returned to tenant — EscrowFinish confirmed on-chain!"
              : "✓ Bond claimed for landlord — EscrowFinish confirmed on-chain!"}
          </p>
          {txHash && (
            <p className="font-mono text-xs break-all text-neutral-500">tx: {txHash}</p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1 rounded-lg bg-neutral-800/40 p-4 text-sm">
            <Row label="Bond amount" value={`${xrpAmount} XRP`} />
            <Row
              label="Recipient"
              value={
                isRefund
                  ? `Tenant (${data.lease.tenantAddress.slice(0, 14)}…)`
                  : `Landlord (${data.lease.landlordAddress.slice(0, 14)}…)`
              }
              mono
            />
            <Row
              label="Reference"
              value={`#${String(isRefund ? data.lease.refundEscrowSequence : data.lease.escrowSequence)}`}
            />
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
              onClick={() => void signAndSubmit()}
              disabled={step !== "review"}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-40 ${
                isRefund
                  ? "bg-green-600 hover:bg-green-500"
                  : "bg-red-700 hover:bg-red-600"
              }`}
            >
              {step === "review" &&
                (isRefund ? "Sign & Return Bond to Tenant" : "Sign & Send Bond to Landlord")}
              {step === "signing" && "Signing…"}
              {step === "confirming" && "Confirming on network…"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""} text-neutral-200`}>
        {value}
      </span>
    </div>
  );
}
