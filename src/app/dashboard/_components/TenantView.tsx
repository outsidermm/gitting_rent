"use client";

import { useState } from "react";
import { Wallet, Client, type EscrowCreate , type EscrowCancel} from "xrpl";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { LeaseCard } from "./LeaseCard";
import { EscrowCreateFlow } from "./EscrowCreateFlow";
import { MoveOutFlow } from "./MoveOutFlow";
import { DEVNET_WSS } from "~/app/constants";

export function TenantView() {
  const { address, refreshBalance } = useWallet();

  const { data: leases, refetch } = api.lease.getByAddress.useQuery(
    { address: address ?? "" },
    { enabled: !!address },
  );

  const tenantLeases = leases?.filter((l) => l.tenantAddress === address);

  const handleUpdate = () => {
    void refetch();
    void refreshBalance();
  };

  if (!tenantLeases?.length) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Leases</h2>
        <p className="text-sm text-neutral-500">
          No leases found for your address. Ask your landlord to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Your Leases</h2>
      {tenantLeases.map((lease) => (
        <LeaseCard
          key={lease.id}
          lease={lease}
          perspective="tenant"
          actions={
            <TenantActions
              lease={lease}
              tenantAddress={address!}
              onUpdate={handleUpdate}
            />
          }
        />
      ))}
    </div>
  );
}

// ── Per-lease action buttons ─────────────────────────────────────────────────

interface TenantActionsProps {
  lease: {
    id: string;
    status: string;
    tenantAddress: string;
    escrowSequence: number | null;
    refundEscrowSequence: number | null;
    approvedVerdict?: string | null;
  };
  tenantAddress: string;
  onUpdate: () => void;
}

function TenantActions({ lease, tenantAddress, onUpdate }: TenantActionsProps) {
  const [activeFlow, setActiveFlow] = useState<"escrow" | "moveout" | null>(
    null,
  );

  if (lease.status === "PENDING_ESCROW") {
    return (
      <>
        <button
          onClick={() =>
            setActiveFlow(activeFlow === "escrow" ? null : "escrow")
          }
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
        >
          {activeFlow === "escrow" ? "Cancel" : "Deposit Bond →"}
        </button>
        {activeFlow === "escrow" && (
          <div className="mt-3 border-t border-neutral-800 pt-4">
            <EscrowCreateFlow
              leaseId={lease.id}
              onSuccess={() => {
                setActiveFlow(null);
                onUpdate();
              }}
            />
          </div>
        )}
      </>
    );
  }

  if (lease.status === "ESCROWED") {
    return (
      <>
        <button
          onClick={() =>
            setActiveFlow(activeFlow === "moveout" ? null : "moveout")
          }
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-500"
        >
          {activeFlow === "moveout" ? "Cancel" : "Submit Move-Out →"}
        </button>
        {activeFlow === "moveout" && (
          <div className="mt-3 border-t border-neutral-800 pt-4">
            <MoveOutFlow
              leaseId={lease.id}
              callerAddress={tenantAddress}
              onSuccess={() => {
                setActiveFlow(null);
                onUpdate();
              }}
            />
          </div>
        )}
      </>
    );
  }

  if (lease.status === "MOVE_OUT_PENDING") {
    return (
      <p className="text-sm text-orange-400">
        Move-out evidence submitted. Waiting for Notary review…
      </p>
    );
  }

  if (lease.status === "APPROVED") {
    const isPenalty = lease.approvedVerdict === "penalty";

    // Determine which escrow was NOT finished so the tenant can cancel it
    const sequenceToCancel = isPenalty
      ? lease.refundEscrowSequence
      : lease.escrowSequence;

    return (
      <div className="space-y-4">
        {isPenalty ? (
          <p className="text-sm text-red-400">
            ⚠ Bond was claimed by the Landlord following Notary review.
          </p>
        ) : (
          <p className="text-sm text-green-400">
            ✓ Bond released to your wallet by the Notary.
          </p>
        )}

        {sequenceToCancel && (
          <div className="border-t border-neutral-800 pt-3">
            <CancelEscrowFlow sequence={sequenceToCancel} />
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Refund Claim Logic ───────────────────────────────────────────────────────

function CancelEscrowFlow({ sequence }: { sequence: number }) {
  const { seed, address, refreshBalance } = useWallet();
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [error, setError] = useState("");

  async function handleCancel() {
    if (!seed || !address) return;
    setStatus("processing");
    setError("");

    let client: Client | null = null;
    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      const tx: EscrowCancel = {
        TransactionType: "EscrowCancel",
        Account: address,
        Owner: address,
        OfferSequence: sequence,
      };

      const prepared = await client.autofill(tx);
      const { tx_blob, hash } = wallet.sign(prepared);
      const result = await client.submitAndWait(tx_blob);

      const meta = result.result.meta as
        | { TransactionResult?: string }
        | undefined;
      const txResult = meta?.TransactionResult;

      if (txResult !== "tesSUCCESS") {
        if (txResult === "tecNO_TARGET") {
          // Escrow no longer exists, it was likely already successfully cancelled
          setStatus("done");
          return;
        }
        if (txResult === "tecNO_PERMISSION") {
          throw new Error(
            "The 1 minute expiry period has not passed yet. Please try again later.",
          );
        }
        throw new Error(`Failed to claim: ${txResult}`);
      }

      await refreshBalance();
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStatus("idle");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-green-400">
        ✓ Unused funds successfully recovered to your wallet.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg bg-neutral-800/40 p-3">
      <div className="space-y-1.5 text-xs text-neutral-400">
        <p className="font-semibold text-neutral-300">
          Unused Deposit Recovery
        </p>
        <p>
          You have unused funds locked in the alternate escrow. You can recover
          them once the 1 minute lock period expires.
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={() => void handleCancel()}
        disabled={status !== "idle" || !seed}
        className="rounded-lg bg-neutral-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-600 disabled:opacity-50"
      >
        {status === "processing" ? "Processing..." : "Claim Unused Deposit"}
      </button>
    </div>
  );
}
