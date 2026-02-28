"use client";

import { useState } from "react";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { LeaseCard } from "./LeaseCard";
import { EscrowCreateFlow } from "./EscrowCreateFlow";
import { MoveOutFlow } from "./MoveOutFlow";

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
      <div className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-lg font-semibold">Your Leases</h2>
        <p className="text-sm text-neutral-500">
          No leases found for your address. Ask your landlord to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
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
          <div className="mt-4">
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
          <div className="mt-4">
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
    return (
      <p className="text-sm text-green-400">
        ✓ Bond released to your wallet by the Notary.
      </p>
    );
  }

  return null;
}
