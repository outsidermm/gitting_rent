"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PhotoUploader } from "~/app/ui/photo-uploader";

const CONDITION_OPTIONS = [
  "Excellent — no damage, professionally cleaned",
  "Good — minor wear, light cleaning needed",
  "Fair — some damage, repairs required",
  "Poor — significant damage, major repairs needed",
];

interface MoveOutFlowProps {
  leaseId: string;
  callerAddress: string;
  onSuccess: () => void;
}

export function MoveOutFlow({
  leaseId,
  callerAddress,
  onSuccess,
}: MoveOutFlowProps) {
  const [exitCondition, setExitCondition] = useState(CONDITION_OPTIONS[0]!);
  const [customNote, setCustomNote] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState("");

  const submitEvidence = api.lease.submitEvidence.useMutation({
    onSuccess,
    onError: () => setError("Unable to submit your move-out report. Please try again."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const fullCondition = customNote.trim()
      ? `${exitCondition} — ${customNote.trim()}`
      : exitCondition;

    submitEvidence.mutate({
      leaseId,
      callerAddress,
      exitCondition: fullCondition,
      exitPhotoUrls: photoUrls,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-orange-900/50 bg-orange-950/20 p-5"
    >
      <h4 className="font-medium text-orange-300">Move-Out Report</h4>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">
          Exit Condition
        </label>
        <select
          value={exitCondition}
          onChange={(e) => setExitCondition(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">
          Additional Notes{" "}
          <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <textarea
          rows={2}
          placeholder="Any specific notes about the exit condition…"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          className="w-full resize-none rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-neutral-300">
          Exit Photos{" "}
          <span className="font-normal text-neutral-500">(optional)</span>
        </label>
        <PhotoUploader
          urls={photoUrls}
          onChange={setPhotoUrls}
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
        disabled={submitEvidence.isPending}
        className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-500 disabled:opacity-40"
      >
        {submitEvidence.isPending ? "Submitting…" : "Submit Move-Out Report"}
      </button>
    </form>
  );
}
