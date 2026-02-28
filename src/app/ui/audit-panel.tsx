import { dropsToXrp } from "xrpl";
import type { Lease } from "~/types/lease";
import { PhotoStrip } from "./photo-strip";
import { EscrowFinishFlow } from "../dashboard/_components/EscrowFinishFlow";

// ── Full audit panel ─────────────────────────────────────────────────────────

export function AuditPanel({
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
          <p className="font-semibold">
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
