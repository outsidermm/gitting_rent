import { dropsToXrp } from "xrpl";
import type { Lease } from "~/types/lease";

const STATUS_LABELS: Record<string, string> = {
  PENDING_ESCROW: "Awaiting Escrow",
  ESCROWED: "Funds Locked",
  APPROVED: "Bond Released",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ESCROW: "text-yellow-400",
  ESCROWED: "text-blue-400",
  APPROVED: "text-green-400",
};

export function OtherLeaseRow({ lease }: { lease: Lease }) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);

  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/80 px-6 py-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <p className="font-mono text-xs text-neutral-500">
          #{lease.id.slice(-8).toUpperCase()}
        </p>
        <p className="text-sm text-neutral-200">
          {xrpAmount} XRP
        </p>
        <span className="text-sm text-neutral-400">
          Tenant {lease.tenantAddress.slice(0, 10)}…
        </span>
      </div>
      <span className={`text-xs font-medium ${STATUS_COLORS[lease.status] ?? "text-neutral-500"}`}>
        {STATUS_LABELS[lease.status] ?? lease.status}
      </span>
    </div>
  );
}
