"use client";

import { useState } from "react";
import { useWallet } from "~/context/WalletContext";
import { api } from "~/trpc/react";
import { PhotoUploader } from "~/app/ui/photo-uploader";
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
    <div className="space-y-8">
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
  const { balance } = useWallet();
  const [form, setForm] = useState({
    propertyAddress: "",
    tenantAddress: "",
    notaryAddress: "",
    bondAmountXrp: "",
    baselineCondition: "",
  });
  const [baselinePhotoUrls, setBaselinePhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState("");

  const isValidXrpAddress = (address: string): boolean => {
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
  };

  const createLease = api.lease.create.useMutation({
    onSuccess: onCreated,
    onError: (e) => {
      const msg = e.message;
      if (
        msg.includes("tenantAddress") ||
        msg.includes("landlordAddress") ||
        msg.includes("notaryAddress")
      ) {
        setError("Invalid XRPL address format.");
      } else if (msg.includes("bondAmountXrp")) {
        setError("Invalid bond amount.");
      } else if (msg.includes("baselineCondition")) {
        setError("Baseline condition exceeds 2000 characters.");
      } else if (msg.includes("baselinePhotoUrls")) {
        setError("Invalid photo URL format.");
      } else {
        setError("An unexpected error occurred.");
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.propertyAddress.trim()) {
      setError("Property address is required.");
      return;
    }
    if (form.tenantAddress.trim() === form.notaryAddress.trim()) {
      setError("Tenant and Notary addresses must be different.");
      return;
    }
    if (!form.tenantAddress.trim() || !form.notaryAddress.trim()) {
      setError("Tenant and Notary addresses are required.");
      return;
    }
    if (!isValidXrpAddress(form.tenantAddress.trim())) {
      setError("Tenant address is not a valid XRP address.");
      return;
    }
    if (!isValidXrpAddress(form.notaryAddress.trim())) {
      setError("Notary address is not a valid XRP address.");
      return;
    }
    if (form.tenantAddress.trim() === landlordAddress) {
      setError("Tenant address must be different from Landlord address.");
      return;
    }
    if (form.notaryAddress.trim() === landlordAddress) {
      setError("Notary address must be different from Landlord address.");
      return;
    }
    if (!form.bondAmountXrp || isNaN(Number(form.bondAmountXrp))) {
      setError("Enter a valid XRP bond amount.");
      return;
    }
    const bondAmount = Number(form.bondAmountXrp);
    if (balance && bondAmount > 0) {
      const currentBalance = Number(balance);
      if (currentBalance - bondAmount < 10) {
        setError(
          `Bond amount would leave less than 10 XRP. Maximum allowed: ${(currentBalance - 10).toFixed(2)} XRP`,
        );
        return;
      }
    }
    if (form.baselineCondition.trim().length > 2000) {
      setError("Baseline condition must be 2000 characters or less.");
      return;
    }

    createLease.mutate({
      landlordAddress,
      propertyAddress: form.propertyAddress.trim(),
      tenantAddress: form.tenantAddress.trim(),
      notaryAddress: form.notaryAddress.trim(),
      bondAmountXrp: form.bondAmountXrp.trim(),
      baselineCondition: form.baselineCondition.trim(),
      baselinePhotoUrls,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80 backdrop-blur-sm"
    >
      <div className="border-b border-neutral-800/60 px-6 py-4">
        <h3 className="font-semibold text-neutral-100">New Lease</h3>
        <p className="text-xs text-neutral-500">
          Fill in the details to create a new bond lease
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* Two-column grid for the address fields */}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Property Address"
            placeholder="123 Main St, City, State"
            value={form.propertyAddress}
            onChange={(v) => setForm((f) => ({ ...f, propertyAddress: v }))}
          />
          <Field
            label="Bond Amount (XRP)"
            placeholder="10"
            type="number"
            value={form.bondAmountXrp}
            onChange={(v) => setForm((f) => ({ ...f, bondAmountXrp: v }))}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
        </div>

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
            className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-neutral-300">
            Baseline Photos{" "}
            <span className="font-normal text-neutral-500">(optional)</span>
          </label>
          <PhotoUploader
            urls={baselinePhotoUrls}
            onChange={setBaselinePhotoUrls}
            onError={setError}
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
      </div>
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
        className="w-full rounded-lg border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none transition focus:border-neutral-500"
      />
    </div>
  );
}
