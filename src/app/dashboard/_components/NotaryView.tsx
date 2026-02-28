"use client";

import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { OtherLeaseRow } from "~/app/ui/other-lease-row";
import { AuditPanel } from "~/app/ui/audit-panel";

export function NotaryView() {
  const { address, refreshBalance } = useWallet();

  const { data: leases, refetch } = api.lease.getByAddress.useQuery(
    { address: address ?? "" },
    { enabled: !!address },
  );

  const handleUpdate = () => {
    void refetch();
    void refreshBalance();
  };

  const pendingLeases = leases?.filter(
    (l) => l.notaryAddress === address && l.status === "MOVE_OUT_PENDING",
  );
  const otherLeases = leases?.filter(
    (l) => l.notaryAddress === address && l.status !== "MOVE_OUT_PENDING",
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Notary Audits</h2>
        <p className="text-sm text-neutral-500">
          Review move-out evidence and release bonds
        </p>
      </div>

      {/* Pending audits */}
      {pendingLeases?.length ? (
        <div className="space-y-6">
          <h3 className="text-sm font-medium tracking-wide text-orange-400 uppercase">
            Pending Review ({pendingLeases.length})
          </h3>
          {pendingLeases.map((lease) => (
            <AuditPanel
              key={lease.id}
              lease={lease}
              _notaryAddress={address!}
              onApproved={handleUpdate}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">
          No pending audits. All caught up!
        </p>
      )}

      {/* Completed / other notary leases */}
      {!!otherLeases?.length && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium tracking-wide text-neutral-500 uppercase">
            Other Leases ({otherLeases.length})
          </h3>
          {otherLeases.map((lease) => (
            <OtherLeaseRow key={lease.id} lease={lease} />
          ))}
        </div>
      )}
    </div>
  );
}

