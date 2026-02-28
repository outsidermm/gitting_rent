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
  PENDING_ESCROW: "bg-yellow-900/40 text-yellow-400 border-yellow-800",
  ESCROWED: "bg-blue-900/40 text-blue-400 border-blue-800",
  MOVE_OUT_PENDING: "bg-orange-900/40 text-orange-400 border-orange-800",
  APPROVED: "bg-green-900/40 text-green-400 border-green-800",
};

interface LeaseCardProps {
  lease: Lease;
  perspective: Role;
  actions?: React.ReactNode;
}

export function LeaseCard({ lease, perspective, actions }: LeaseCardProps) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);

  return (
    <div className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-neutral-500">
            Lease #{lease.id.slice(-8).toUpperCase()}
          </p>
          <p className="mt-0.5 text-base font-semibold">{xrpAmount} XRP bond</p>
          <p className="mt-1 text-sm text-neutral-300">
            {lease.propertyAddress}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lease.status] ?? ""}`}
        >
          {STATUS_LABELS[lease.status] ?? lease.status}
        </span>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-3 gap-2 text-xs">
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
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Baseline Condition
        </p>
        <p className="text-sm text-neutral-300">{lease.baselineCondition}</p>
      </div>

      {/* Baseline photos */}
      {lease.baselinePhotoUrls.length > 0 && (
        <PhotoGrid label="Baseline Photos" urls={lease.baselinePhotoUrls} />
      )}

      {/* Move-out evidence */}
      {lease.evidence && (
        <div className="space-y-2 border-t border-neutral-800 pt-4">
          <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
            Move-Out Evidence
          </p>
          <p className="text-sm text-neutral-300">
            {lease.evidence.exitCondition}
          </p>
          {lease.evidence.exitPhotoUrls.length > 0 && (
            <PhotoGrid
              label="Exit Photos"
              urls={lease.evidence.exitPhotoUrls}
            />
          )}
        </div>
      )}

      {/* Injected action buttons */}
      {actions && (
        <div className="border-t border-neutral-800 pt-4">{actions}</div>
      )}
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
      className={`rounded-lg border px-2 py-1.5 ${highlight ? "border-neutral-600 bg-neutral-800" : "border-neutral-800"}`}
    >
      <p className="text-neutral-500">{label}</p>
      <p className="truncate font-mono text-neutral-300">
        {address.slice(0, 8)}…
      </p>
    </div>
  );
}

function PhotoGrid({ label, urls }: { label: string; urls: string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-md border border-neutral-700"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${label} ${i + 1}`}
              className="h-20 w-20 object-cover"
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
