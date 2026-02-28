"use client";

/**
 * EscrowFinishFlow
 *
 * Mirrors EscrowCreateFlow but for the notary releasing the bond.
 * The unsigned tx (including the fulfillment secret) comes from the server
 * via getEscrowFinishPayload; autofill + sign + submitAndWait run in the
 * notary's browser so their seed never leaves the device.
 */

import { useState } from "react";
import { Wallet, Client, dropsToXrp } from "xrpl";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { DEVNET_WSS } from "~/app/constants";
import type { Step } from "~/types/step";

interface EscrowFinishFlowProps {
  leaseId: string;
  onSuccess: () => void;
}

export function EscrowFinishFlow({ leaseId, onSuccess }: EscrowFinishFlowProps) {
  const { seed, address } = useWallet();
  const [step, setStep] = useState<Step>("review");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const {
    data,
    isLoading,
    error: queryError,
  } = api.lease.getEscrowFinishPayload.useQuery(
    { leaseId, callerAddress: address! },
    { enabled: !!address, retry: false },
  );

  const approveRefund = api.lease.approveRefund.useMutation({
    onSuccess,
    onError: (e) => setError(`DB update failed: ${e.message}`),
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

      const partialTx = data.tx;

      // Compute elevated fee: 10 * ceil((33 + fulfillment_bytes) / 16)
      const fulfillmentBytes = Math.ceil(partialTx.Fulfillment!.length / 2);
      const elevatedFee = String(10 * Math.ceil((33 + fulfillmentBytes) / 16));

      const prepared = await client.autofill({
        ...partialTx,
        Fee: elevatedFee,
      });
      console.debug(
        "[EscrowFinish] prepared tx:",
        JSON.stringify(prepared, null, 2),
      );

      const { tx_blob, hash } = wallet.sign(prepared);
      setStep("confirming");

      const result = await client.submitAndWait(tx_blob);
      const meta = result.result.meta as
        | { TransactionResult?: string }
        | undefined;
      const txResult = meta?.TransactionResult;

      console.debug(
        "[EscrowFinish] result:",
        JSON.stringify(result.result, null, 2),
      );

      if (txResult !== "tesSUCCESS") {
        throw new Error(
          `EscrowFinish rejected: ${txResult ?? "no result code"}`,
        );
      }

      setTxHash(hash);
      await client.disconnect();
      client = null;

      approveRefund.mutate({ leaseId, callerAddress: address! });
      setStep("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
      setStep("review");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

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
    <div className="space-y-4 rounded-xl border border-green-900/50 bg-green-950/20 p-5">
      <h4 className="font-medium text-green-300">Release Bond</h4>

      {step === "done" ? (
        <div className="space-y-2">
          <p className="text-sm text-green-400">
            ✓ Bond released — EscrowFinish confirmed on-chain!
          </p>
          {txHash && (
            <p className="font-mono text-xs break-all text-neutral-500">
              tx: {txHash}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-1 rounded-lg border border-green-900/40 bg-green-950/30 p-4 text-sm">
            <Row label="Bond amount" value={`${xrpAmount} XRP`} />
            <Row
              label="Tenant"
              value={`${data.lease.tenantAddress.slice(0, 14)}…`}
              mono
            />
            <Row
              label="Escrow sequence"
              value={String(data.lease.escrowSequence)}
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
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-40"
            >
              {step === "review" && "Sign & Release Bond"}
              {step === "signing" && "Signing…"}
              {step === "confirming" && "Confirming on XRPL Devnet…"}
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
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} text-neutral-200`}
      >
        {value}
      </span>
    </div>
  );
}
