"use client";

import { dropsToXrp } from "xrpl";
import type { Role } from "~/types/role";
import type { Lease } from "~/types/lease";

const STATUS_LABELS: Record<string, string> = {
  PENDING_ESCROW: "Awaiting Escrow",
  ESCROWED: "Funds Locked",
  MOVE_OUT_PENDING: "Move-Out Review",
  APPROVED: "Bond Released",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_ESCROW: "bg-yellow-900/30 text-yellow-400 border-yellow-800/60",
  ESCROWED: "bg-blue-900/30 text-blue-400 border-blue-800/60",
  MOVE_OUT_PENDING: "bg-orange-900/30 text-orange-400 border-orange-800/60",
  APPROVED: "bg-green-900/30 text-green-400 border-green-800/60",
};

interface LeaseCardProps {
  lease: Lease;
  perspective: Role;
  actions?: React.ReactNode;
}

export function LeaseCard({ lease, perspective, actions }: LeaseCardProps) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);
  const hasPhotos =
    lease.baselinePhotoUrls.length > 0 ||
    (lease.evidence && lease.evidence.exitPhotoUrls.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
      {/* Card header */}
      <div className="flex items-center justify-between border-b border-neutral-800/60 px-6 py-3.5">
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs text-neutral-500">
            #{lease.id.slice(-8).toUpperCase()}
          </p>
          <p className="text-sm font-semibold text-neutral-100">
            {xrpAmount} XRP bond
          </p>
          <span className="text-sm text-neutral-400">
            {lease.propertyAddress}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lease.status] ?? ""}`}
        >
          {STATUS_LABELS[lease.status] ?? lease.status}
        </span>
      </div>

      {/* Card body — horizontal layout */}
      <div className={`flex ${hasPhotos ? "divide-x divide-neutral-800/60" : ""}`}>
        {/* Left: text info */}
        <div className="flex-1 space-y-4 p-6">
          {/* Addresses */}
          <div className="flex gap-3">
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

          {/* Baseline condition */}
          {lease.baselineCondition && (
            <div className="space-y-1">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                Baseline Condition
              </p>
              <p className="text-sm leading-relaxed text-neutral-300">
                {lease.baselineCondition}
              </p>
            </div>
          )}

          {/* Move-out evidence text */}
          {lease.evidence && (
            <div className="space-y-1 border-t border-neutral-800/60 pt-4">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                Move-Out Evidence
              </p>
              <p className="text-sm leading-relaxed text-neutral-300">
                {lease.evidence.exitCondition}
              </p>
            </div>
          )}

          {/* Actions */}
          {actions && (
            <div className="border-t border-neutral-800/60 pt-4">{actions}</div>
          )}
        </div>

        {/* Right: photos */}
        {hasPhotos && (
          <div className="w-64 shrink-0 space-y-4 p-5">
            {lease.baselinePhotoUrls.length > 0 && (
              <PhotoGrid label="Baseline Photos" urls={lease.baselinePhotoUrls} />
            )}
            {lease.evidence && lease.evidence.exitPhotoUrls.length > 0 && (
              <PhotoGrid
                label="Exit Photos"
                urls={lease.evidence.exitPhotoUrls}
              />
            )}
          </div>
        )}
      </div>
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
      className={`rounded-lg border px-3 py-2 text-xs ${
        highlight
          ? "border-neutral-600 bg-neutral-800/80"
          : "border-neutral-800 bg-neutral-950/40"
      }`}
    >
      <p className="text-neutral-500">{label}</p>
      <p className="truncate font-mono text-neutral-300">
        {address.slice(0, 10)}…
      </p>
    </div>
  );
}

function PhotoGrid({ label, urls }: { label: string; urls: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-lg border border-neutral-700/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${label} ${i + 1}`}
              className="aspect-square w-full object-cover transition group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23262626'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23525252' font-size='10'%3ENo image%3C/text%3E%3C/svg%3E";
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
