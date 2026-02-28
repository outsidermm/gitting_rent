"use client";

import { useState } from "react";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { LeaseCard } from "./LeaseCard";

export function LandlordView() {
  const { address } = useWallet();
  const [showForm, setShowForm] = useState(false);

  const { data: leases, refetch } = api.lease.getByAddress.useQuery(
    { address: address ?? "" },
    { enabled: !!address },
  );

  const landlordLeases = leases?.filter((l) => l.landlordAddress === address);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your Properties</h2>
          <p className="text-sm text-neutral-500">
            Manage bonds and lease statuses
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-white"
        >
          {showForm ? "Cancel" : "+ New Lease"}
        </button>
      </div>

      {/* Create lease form */}
      {showForm && (
        <CreateLeaseForm
          landlordAddress={address!}
          onCreated={() => {
            setShowForm(false);
            void refetch();
          }}
        />
      )}

      {/* Lease list */}
      {!landlordLeases?.length && !showForm && (
        <p className="text-sm text-neutral-500">
          No leases yet. Create one to get started.
        </p>
      )}
      <div className="space-y-4">
        {landlordLeases?.map((lease) => (
          <LeaseCard key={lease.id} lease={lease} perspective="landlord" />
        ))}
      </div>
    </div>
  );
}

// ── Create Lease Form ────────────────────────────────────────────────────────

interface CreateLeaseFormProps {
  landlordAddress: string;
  onCreated: () => void;
}

function CreateLeaseForm({ landlordAddress, onCreated }: CreateLeaseFormProps) {
  const [form, setForm] = useState({
    propertyAddress: "",
    tenantAddress: "",
    notaryAddress: "",
    bondAmountXrp: "",
    baselineCondition: "",
    baselinePhotoUrls: "",
  });
  const [error, setError] = useState("");

  const createLease = api.lease.create.useMutation({
    onSuccess: onCreated,
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const photoUrls = form.baselinePhotoUrls
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    // Basic client-side validation
    if (!form.propertyAddress.trim()) {
      setError("Housing address is required.");
      return;
    }
    if (!form.tenantAddress.trim() || !form.notaryAddress.trim()) {
      setError("Tenant and Notary addresses are required.");
      return;
    }
    if (!form.bondAmountXrp || isNaN(Number(form.bondAmountXrp))) {
      setError("Enter a valid XRP bond amount.");
      return;
    }
    if (!form.baselineCondition.trim()) {
      setError("Baseline condition description is required.");
      return;
    }

    createLease.mutate({
      landlordAddress,
      propertyAddress: form.propertyAddress.trim(),
      tenantAddress: form.tenantAddress.trim(),
      notaryAddress: form.notaryAddress.trim(),
      bondAmountXrp: form.bondAmountXrp.trim(),
      baselineCondition: form.baselineCondition.trim(),
      baselinePhotoUrls: photoUrls,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
    >
      <h3 className="font-medium text-neutral-200">New Lease</h3>

      <Field
        label="Property Address"
        placeholder="123 Main St, City, State"
        value={form.propertyAddress}
        onChange={(v) => setForm((f) => ({ ...f, propertyAddress: v }))}
      />
      <Field
        label="Tenant XRPL Address"
        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        value={form.tenantAddress}
        onChange={(v) => setForm((f) => ({ ...f, tenantAddress: v }))}
      />
      <Field
        label="Notary XRPL Address"
        placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXX"
        value={form.notaryAddress}
        onChange={(v) => setForm((f) => ({ ...f, notaryAddress: v }))}
      />
      <Field
        label="Bond Amount (XRP)"
        placeholder="10"
        type="number"
        value={form.bondAmountXrp}
        onChange={(v) => setForm((f) => ({ ...f, bondAmountXrp: v }))}
      />

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">
          Baseline Condition
        </label>
        <textarea
          rows={3}
          placeholder="Describe the property's current condition…"
          value={form.baselineCondition}
          onChange={(e) =>
            setForm((f) => ({ ...f, baselineCondition: e.target.value }))
          }
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">
          Baseline Photo URLs{" "}
          <span className="font-normal text-neutral-500">(one per line)</span>
        </label>
        <textarea
          rows={3}
          placeholder={"https://…\nhttps://…"}
          value={form.baselinePhotoUrls}
          onChange={(e) =>
            setForm((f) => ({ ...f, baselinePhotoUrls: e.target.value }))
          }
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 font-mono text-xs text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={createLease.isPending}
        className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-white disabled:opacity-40"
      >
        {createLease.isPending ? "Creating…" : "Create Lease"}
      </button>
    </form>
  );
}

// ── Reusable field component ─────────────────────────────────────────────────

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-300">
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
      />
    </div>
  );
}
