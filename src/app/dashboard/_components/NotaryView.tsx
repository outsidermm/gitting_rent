"use client";

import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { dropsToXrp } from "xrpl";
import { type RouterOutputs } from "~/trpc/react";
import { EscrowFinishFlow } from "./EscrowFinishFlow";

type Lease = RouterOutputs["lease"]["getByAddress"][number];

export function NotaryView() {
  const { address } = useWallet();

  const { data: leases, refetch } = api.lease.getByAddress.useQuery(
    { address: address ?? "" },
    { enabled: !!address },
  );

  const pendingLeases = leases?.filter(
    (l) => l.notaryAddress === address && l.status === "MOVE_OUT_PENDING",
  );
  const otherLeases = leases?.filter(
    (l) => l.notaryAddress === address && l.status !== "MOVE_OUT_PENDING",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
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
              onApproved={() => void refetch()}
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

// ── Full audit panel ─────────────────────────────────────────────────────────

function AuditPanel({
  lease,
  _notaryAddress,
  onApproved,
}: {
  lease: Lease;
  _notaryAddress: string;
  onApproved: () => void;
}) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);

  return (
    <div className="overflow-hidden rounded-xl border border-orange-900/50 bg-neutral-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orange-900/30 bg-orange-950/20 px-5 py-3">
        <div>
          <span className="font-mono text-xs text-neutral-500">
            #{lease.id.slice(-8).toUpperCase()}
          </span>
          <p className="font-semibold">{lease.propertyAddress}</p>
          <p className="text-sm text-neutral-400">
            {xrpAmount} XRP bond — Tenant {lease.tenantAddress.slice(0, 10)}…
          </p>
        </div>
        <span className="rounded-full border border-orange-800 bg-orange-900/40 px-2.5 py-0.5 text-xs font-medium text-orange-400">
          Move-Out Pending
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-neutral-800">
        {/* Baseline */}
        <div className="space-y-3 p-5">
          <h4 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Baseline (Move-In)
          </h4>
          <p className="text-sm text-neutral-300">{lease.baselineCondition}</p>
          {lease.baselinePhotoUrls.length > 0 && (
            <PhotoStrip urls={lease.baselinePhotoUrls} />
          )}
        </div>

        {/* Move-out */}
        <div className="space-y-3 p-5">
          <h4 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Exit (Move-Out)
          </h4>
          {lease.evidence ? (
            <>
              <p className="text-sm text-neutral-300">
                {lease.evidence.exitCondition}
              </p>
              {lease.evidence.exitPhotoUrls.length > 0 && (
                <PhotoStrip urls={lease.evidence.exitPhotoUrls} />
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">No evidence submitted.</p>
          )}
        </div>
      </div>

      {/* Approve section */}
      <div className="border-t border-neutral-800 p-5">
        <EscrowFinishFlow leaseId={lease.id} onSuccess={onApproved} />
      </div>
    </div>
  );
}

// ── Compact row for non-pending leases ───────────────────────────────────────

function OtherLeaseRow({ lease }: { lease: Lease }) {
  const STATUS_LABELS: Record<string, string> = {
    PENDING_ESCROW: "Awaiting Escrow",
    ESCROWED: "Funds Locked",
    APPROVED: "Bond Released",
  };
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-5 py-3">
      <div>
        <p className="font-mono text-xs text-neutral-500">
          #{lease.id.slice(-8).toUpperCase()}
        </p>
        <p className="text-sm">{lease.propertyAddress}</p>
        <p className="text-sm text-neutral-400">
          {xrpAmount} XRP — Tenant {lease.tenantAddress.slice(0, 10)}…
        </p>
      </div>
      <span className="text-xs text-neutral-500">
        {STATUS_LABELS[lease.status] ?? lease.status}
      </span>
    </div>
  );
}

// ── Photo strip ──────────────────────────────────────────────────────────────

function PhotoStrip({ urls }: { urls: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {urls.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`photo ${i + 1}`}
            className="h-16 w-16 rounded-md border border-neutral-700 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      ))}
    </div>
  );
}
