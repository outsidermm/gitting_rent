import { dropsToXrp } from "xrpl";
import type { Lease } from "~/types/lease";

// ── Compact row for non-pending leases ───────────────────────────────────────

export function OtherLeaseRow({ lease }: { lease: Lease }) {
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
        <p className="text-sm">
          {xrpAmount} XRP — Tenant {lease.tenantAddress.slice(0, 10)}…
        </p>
      </div>
      <span className="text-xs text-neutral-500">
        {STATUS_LABELS[lease.status] ?? lease.status}
      </span>
    </div>
  );
}
