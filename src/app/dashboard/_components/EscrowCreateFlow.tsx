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
import type { Step } from "~/types/step";
import { Row } from "~/app/ui/row";
import { DEVNET_WSS } from "~/app/constants";

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
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const {
    data,
    isLoading,
    error: queryError,
  } = api.lease.getEscrowCreatePayload.useQuery({ leaseId }, { retry: false });

  const confirmEscrow = api.lease.confirmEscrow.useMutation({
    onSuccess,
    onError: () => setError("Your deposit was placed on-chain but we could not update the lease. Please refresh and check your lease status."),
  });

  async function signAndSubmit() {
    if (!seed || !data) return;
    setStep("signing");
    setError("");

    let client: Client | null = null;

    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      // Cast: the server returns Partial<EscrowCreate> but the required
      // fields (TransactionType, Account, Amount, Destination) are always set.
      const partialTx = data.tx as EscrowCreate;

      const prepared = await client.autofill(partialTx);

      const { tx_blob, hash } = wallet.sign(prepared);
      setStep("confirming");

      const result = await client.submitAndWait(tx_blob);
      const meta = result.result.meta as
        | { TransactionResult?: string }
        | undefined;
      const txResult = meta?.TransactionResult;

      if (txResult !== "tesSUCCESS") {
        throw new Error("Your deposit could not be placed. Please try again.");
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
      const msg = e instanceof Error ? e.message : "Something went wrong. Please try again.";
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
        Unable to load deposit details. Please refresh and try again.
      </p>
    );
  }

  const xrpAmount = dropsToXrp(data.lease.bondAmountDrops);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-blue-300">Deposit Bond</h4>

      {step === "done" ? (
        <div className="space-y-2">
          <p className="text-sm text-green-400">✓ Escrow created on-chain!</p>
          {txHash && (
            <p className="font-mono text-xs break-all text-neutral-500">
              tx: {txHash}
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="space-y-1 text-sm">
            <Row label="Amount" value={`${xrpAmount} XRP`} />
            <Row
              label="Landlord"
              value={`${data.lease.landlordAddress.slice(0, 14)}…`}
              mono
            />
            <Row label="Release" value="Approved by notary" />
            <Row label="Cancellation" value="Available after 90 days" />
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
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-40"
            >
              {step === "review" && "Sign & Lock Bond"}
              {step === "signing" && "Signing…"}
              {step === "confirming" && "Confirming on network…"}
            </button>
          )}
        </>
      )}
    </div>
  );
}