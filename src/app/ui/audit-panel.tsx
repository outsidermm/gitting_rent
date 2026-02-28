import { dropsToXrp } from "xrpl";
import type { Lease } from "~/types/lease";
import { PhotoStrip } from "./photo-strip";
import { EscrowFinishFlow } from "../dashboard/_components/EscrowFinishFlow";

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

  const submittedAt = lease.evidence?.submittedAt
    ? new Date(lease.evidence.submittedAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-neutral-500">
            #{lease.id.slice(-8).toUpperCase()}
          </span>
          <span className="text-neutral-700">·</span>
          <p className="text-sm font-semibold text-neutral-100">
            {xrpAmount} XRP
          </p>
          <span className="text-neutral-700">·</span>
          <span className="font-mono text-xs text-neutral-400">
            {lease.tenantAddress.slice(0, 12)}…
          </span>
        </div>
        <span className="rounded-full bg-orange-900/30 px-2.5 py-0.5 text-xs font-medium text-orange-400">
          Awaiting Review
        </span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 divide-x divide-neutral-800">
        {/* Baseline column */}
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <h4 className="text-xs font-semibold tracking-wide text-blue-400 uppercase">
              Move-In Baseline
            </h4>
          </div>
          <p className="text-sm leading-relaxed text-neutral-300">
            {lease.baselineCondition}
          </p>
          {lease.baselinePhotoUrls.length > 0 && (
            <PhotoStrip urls={lease.baselinePhotoUrls} />
          )}
        </div>

        {/* Exit column */}
        <div className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <h4 className="text-xs font-semibold tracking-wide text-orange-400 uppercase">
                Move-Out Evidence
              </h4>
            </div>
            {submittedAt && (
              <span className="text-xs text-neutral-600">{submittedAt}</span>
            )}
          </div>
          {lease.evidence ? (
            <>
              <p className="text-sm leading-relaxed text-neutral-300">
                {lease.evidence.exitCondition}
              </p>
              {lease.evidence.exitPhotoUrls.length > 0 && (
                <PhotoStrip urls={lease.evidence.exitPhotoUrls} />
              )}
            </>
          ) : (
            <p className="text-sm text-neutral-500">No evidence submitted yet.</p>
          )}
        </div>
      </div>

      {/* Bond release */}
      <div className="border-t border-neutral-800 p-5">
        <EscrowFinishFlow
          leaseId={lease.id}
          exitCondition={lease.evidence?.exitCondition ?? ""}
          onSuccess={onApproved}
        />
      </div>
    </div>
  );
}
