"use client";

/**
 * EscrowCreateFlow
 *
 * Handles the in-browser signing and submission of the EscrowCreate
 * transaction. The unsigned tx template comes from the server (tRPC);
 * autofill + sign + submitAndWait happen entirely client-side so the
 * tenant's live account sequence is always fresh.
 */

import { useState } from "react";
import { Wallet, Client, dropsToXrp } from "xrpl";
import type { EscrowCreate } from "xrpl";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";

const DEVNET_WSS = "wss://s.devnet.rippletest.net:51233";

interface Props {
  leaseId: string;
  onSuccess: () => void;
}

type Step = "review" | "signing" | "confirming" | "done";

export function EscrowCreateFlow({ leaseId, onSuccess }: Props) {
  const { seed, address } = useWallet();
  const [step, setStep] = useState<Step>("review");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  const { data, isLoading, error: queryError } = api.lease.getEscrowCreatePayload.useQuery(
    { leaseId },
    { retry: false },
  );

  const confirmEscrow = api.lease.confirmEscrow.useMutation({
    onSuccess,
    onError: (e) => setError(`Backend confirmation failed: ${e.message}`),
  });

  async function signAndSubmit() {
    if (!seed || !data) return;
    setStep("signing");
    setError("");
    setDebugInfo("");

    let client: Client | null = null;

    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      // Cast: the server returns Partial<EscrowCreate> but the required
      // fields (TransactionType, Account, Amount, Destination) are always set.
      const partialTx = data.tx as EscrowCreate;

      // autofill adds: Sequence, Fee (elevated for condition tx), LastLedgerSequence
      const prepared = await client.autofill(partialTx);

      // Log the exact prepared tx so temMALFORMED can be diagnosed
      console.debug("[EscrowCreate] prepared tx:", JSON.stringify(prepared, null, 2));
      const amountStr = typeof prepared.Amount === "string" ? prepared.Amount : JSON.stringify(prepared.Amount);
      setDebugInfo(
        `Condition: ${prepared.Condition?.slice(0, 20) ?? "missing"}… | ` +
        `Amount: ${amountStr} drops | ` +
        `Seq: ${String(prepared.Sequence)}`
      );

      const { tx_blob, hash } = wallet.sign(prepared);
      setStep("confirming");

      const result = await client.submitAndWait(tx_blob);
      const meta = result.result.meta as { TransactionResult?: string } | undefined;
      const txResult = meta?.TransactionResult;

      console.debug("[EscrowCreate] result:", JSON.stringify(result.result, null, 2));

      if (txResult !== "tesSUCCESS") {
        throw new Error(
          `Transaction not accepted: ${txResult ?? "no result code"}. ` +
          `Check browser console for the full prepared tx.`
        );
      }

      // The sequence number used in EscrowCreate becomes OfferSequence in EscrowFinish
      const escrowSequence = prepared.Sequence!;
      setTxHash(hash);

      await client.disconnect();
      client = null;

      confirmEscrow.mutate({
        leaseId,
        escrowSequence,
        escrowOwnerAddress: address!,
      });

      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStep("review");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

  // ── render ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading escrow details…</p>;
  }

  if (queryError ?? !data) {
    return (
      <p className="text-sm text-red-400">
        {queryError?.message ?? "Failed to load escrow payload."}
      </p>
    );
  }

  const xrpAmount = dropsToXrp(data.lease.bondAmountDrops);

  return (
    <div className="space-y-4 rounded-xl border border-blue-900/50 bg-blue-950/20 p-5">
      <h4 className="font-medium text-blue-300">Deposit Bond</h4>

      {step === "done" ? (
        <div className="space-y-2">
          <p className="text-sm text-green-400">✓ Escrow created on-chain!</p>
          {txHash && (
            <p className="break-all font-mono text-xs text-neutral-500">tx: {txHash}</p>
          )}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="space-y-1 rounded-lg border border-blue-900/40 bg-blue-950/30 p-4 text-sm">
            <Row label="Amount" value={`${xrpAmount} XRP`} />
            <Row
              label="Landlord"
              value={`${data.lease.landlordAddress.slice(0, 14)}…`}
              mono
            />
            <Row label="Release mechanism" value="Notary PREIMAGE-SHA-256" />
            <Row label="Cancel after" value="90 days (tenant safety valve)" />
          </div>

          {debugInfo && (
            <p className="break-all rounded bg-neutral-800 px-2 py-1 font-mono text-xs text-neutral-400">
              {debugInfo}
            </p>
          )}

          {error && (
            <p className="whitespace-pre-wrap rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-400">
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
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              {step === "review" && "Sign & Lock Bond"}
              {step === "signing" && "Signing…"}
              {step === "confirming" && "Confirming on XRPL Devnet…"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""} text-neutral-200`}>
        {value}
      </span>
    </div>
  );
}
