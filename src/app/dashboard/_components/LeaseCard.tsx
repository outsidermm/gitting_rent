"use client";

import { dropsToXrp } from "xrpl";
import type { Role } from "~/types/role";
import type { Lease } from "~/types/lease";

const STATUS_LABELS: Record<string, string> = {
  PENDING_ESCROW: "Awaiting Escrow",
  ESCROWED: "Funds Locked",
  MOVE_OUT_PENDING: "Move-Out Review",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ESCROW:
    "bg-yellow-950/50 text-yellow-400 border border-yellow-900/50",
  ESCROWED: "bg-blue-950/50 text-blue-400 border border-blue-900/50",
  MOVE_OUT_PENDING:
    "bg-orange-950/50 text-orange-400 border border-orange-900/50",
};

interface LeaseCardProps {
  lease: Lease;
  perspective: Role;
  actions?: React.ReactNode;
}

export function LeaseCard({ lease, perspective, actions }: LeaseCardProps) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);
  const exitPhotos = lease.evidence?.exitPhotoUrls ?? [];

  // Dynamically determine label and styling based on the Notary's verdict
  let statusLabel = STATUS_LABELS[lease.status] ?? lease.status;
  let statusColor =
    STATUS_COLORS[lease.status] ?? "bg-neutral-800 text-neutral-400";

  if (lease.status === "APPROVED") {
    if (lease.approvedVerdict === "penalty") {
      statusLabel = "Notary Verdict: Landlord Paid (Poor Condition)";
      statusColor =
        "bg-red-950/80 text-red-400 border border-red-800/60 font-bold shadow-sm shadow-red-900/20";
    } else {
      statusLabel = "Notary Verdict: Tenant Refunded (Condition OK)";
      statusColor =
        "bg-green-950/80 text-green-400 border border-green-800/60 font-bold shadow-sm shadow-green-900/20";
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-neutral-500">
            #{lease.id.slice(-8).toUpperCase()}
          </span>
          <p className="text-sm font-semibold text-neutral-100">
            {xrpAmount} XRP bond
          </p>
          <span className="text-sm text-neutral-400">
            {lease.propertyAddress}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusColor}`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Body */}
      <div className="space-y-4 px-6 pb-6">
        {/* Addresses */}
        <div className="flex flex-wrap gap-2">
          <AddressChip
            label="Landlord"
            address={lease.landlordAddress}
            highlight={perspective === "landlord"}
          />
          <AddressChip
            label="Tenant"
            address={lease.tenantAddress}
            highlight={perspective === "tenant"}
          />
          <AddressChip
            label="Notary"
            address={lease.notaryAddress}
            highlight={perspective === "notary"}
          />
        </div>

        {/* Baseline condition + photos */}
        {lease.baselineCondition && (
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Baseline Condition
            </p>
            <p className="text-sm leading-relaxed text-neutral-300">
              {lease.baselineCondition}
            </p>
            {lease.baselinePhotoUrls.length > 0 && (
              <PhotoStrip urls={lease.baselinePhotoUrls} />
            )}
          </div>
        )}

        {/* Move-out evidence + photos */}
        {lease.evidence && (
          <div className="space-y-2 border-t border-neutral-800 pt-4">
            <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Move-Out Evidence
            </p>
            <p className="text-sm leading-relaxed text-neutral-300">
              {lease.evidence.exitCondition}
            </p>
            {exitPhotos.length > 0 && <PhotoStrip urls={exitPhotos} />}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="border-t border-neutral-800 pt-4">{actions}</div>
        )}
      </div>
    </div>
  );
}

function PhotoStrip({ urls }: { urls: string[] }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {urls.map((url, i) => (
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group shrink-0 overflow-hidden rounded-lg border border-neutral-700 transition hover:border-neutral-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`photo ${i + 1}`}
            className="h-20 w-20 object-cover transition group-hover:brightness-110"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </a>
      ))}
    </div>
  );
}

function AddressChip({
  label,
  address,
  highlight,
}: {
  label: string;
  address: string;
  highlight: boolean;
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 text-xs ${
        highlight ? "bg-neutral-700/50" : "bg-neutral-800/40"
      }`}
    >
      <p className="text-neutral-500">{label}</p>
      <p className="truncate font-mono text-neutral-300">
        {address.slice(0, 10)}…
      </p>
    </div>
  );
}
