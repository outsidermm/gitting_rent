"use client";

import { useState } from "react";
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
  PENDING_ESCROW: "bg-yellow-900/30 text-yellow-400",
  ESCROWED: "bg-blue-900/30 text-blue-400",
  MOVE_OUT_PENDING: "bg-orange-900/30 text-orange-400",
  APPROVED: "bg-green-900/30 text-green-400",
};

interface CarouselPhoto {
  url: string;
  group: "Baseline" | "Exit";
}

interface LeaseCardProps {
  lease: Lease;
  perspective: Role;
  actions?: React.ReactNode;
}

export function LeaseCard({ lease, perspective, actions }: LeaseCardProps) {
  const xrpAmount = dropsToXrp(lease.bondAmountDrops);

  const photos: CarouselPhoto[] = [
    ...lease.baselinePhotoUrls.map((url) => ({ url, group: "Baseline" as const })),
    ...((lease.evidence?.exitPhotoUrls ?? []).map((url) => ({
      url,
      group: "Exit" as const,
    }))),
  ];
  const hasPhotos = photos.length > 0;

  return (
    <div className="flex items-stretch gap-5">
      {/* Card */}
      <div className="flex-1 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
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
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[lease.status] ?? ""}`}
          >
            {STATUS_LABELS[lease.status] ?? lease.status}
          </span>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 pb-6">
          {/* Addresses */}
          <div className="flex gap-2">
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

          {/* Move-out evidence */}
          {lease.evidence && (
            <div className="space-y-1 pt-3">
              <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
                Move-Out Evidence
              </p>
              <p className="text-sm leading-relaxed text-neutral-300">
                {lease.evidence.exitCondition}
              </p>
            </div>
          )}

          {/* Actions */}
          {actions && <div className="pt-3">{actions}</div>}
        </div>
      </div>

      {/* Photo carousel — outside the card, height-matched */}
      {hasPhotos && (
        <div className="w-56 shrink-0 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
          <PhotoCarousel photos={photos} />
        </div>
      )}
    </div>
  );
}

function PhotoCarousel({ photos }: { photos: CarouselPhoto[] }) {
  const [index, setIndex] = useState(0);
  const current = photos[index]!;
  const total = photos.length;

  const prev = () => setIndex((i) => (i - 1 + total) % total);
  const next = () => setIndex((i) => (i + 1) % total);

  return (
    <div className="relative flex h-full flex-col">
      {/* Top bar: label + counter + arrows */}
      <div className="flex items-center justify-between bg-neutral-900/90 px-3 py-2 backdrop-blur-sm">
        <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
          {current.group}
        </span>

        {total > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={prev}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition hover:bg-neutral-700 hover:text-neutral-200"
              aria-label="Previous photo"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="translate-x-[-0.5px]"
              >
                <path
                  d="M7.5 2.5L4 6l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="min-w-[2rem] text-center font-mono text-[10px] text-neutral-500">
              {index + 1}/{total}
            </span>
            <button
              onClick={next}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-neutral-400 transition hover:bg-neutral-700 hover:text-neutral-200"
              aria-label="Next photo"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="translate-x-[0.5px]"
              >
                <path
                  d="M4.5 2.5L8 6l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      <a
        href={current.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block flex-1 overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={`${current.group} photo ${index + 1}`}
          className="absolute inset-0 h-full w-full object-cover transition-opacity group-hover:opacity-90"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23262626'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23525252' font-size='12'%3ENo image%3C/text%3E%3C/svg%3E";
          }}
        />
      </a>
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
