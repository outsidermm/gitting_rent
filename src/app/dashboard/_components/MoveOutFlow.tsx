"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { PhotoUploader } from "~/app/ui/photo-uploader";

const CONDITION_OPTIONS = [
  {
    value: "Excellent — no damage, professionally cleaned",
    label: "Excellent",
    description: "No damage, professionally cleaned",
    ring: "ring-green-600",
    bg: "bg-green-900/20 border-green-800/60",
    dot: "bg-green-500",
    label_color: "text-green-400",
  },
  {
    value: "Good — minor wear, light cleaning needed",
    label: "Good",
    description: "Minor wear, light cleaning needed",
    ring: "ring-blue-600",
    bg: "bg-blue-900/20 border-blue-800/60",
    dot: "bg-blue-500",
    label_color: "text-blue-400",
  },
  {
    value: "Fair — some damage, repairs required",
    label: "Fair",
    description: "Some damage, repairs required",
    ring: "ring-yellow-600",
    bg: "bg-yellow-900/20 border-yellow-800/60",
    dot: "bg-yellow-500",
    label_color: "text-yellow-400",
  },
  {
    value: "Poor — significant damage, major repairs needed",
    label: "Poor",
    description: "Significant damage, major repairs needed",
    ring: "ring-red-600",
    bg: "bg-red-900/20 border-red-800/60",
    dot: "bg-red-500",
    label_color: "text-red-400",
  },
] as const;

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
  const [exitCondition, setExitCondition] = useState<string>(CONDITION_OPTIONS[0].value);
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
      className="space-y-5 rounded-xl border border-orange-900/40 bg-orange-950/10 p-5"
    >
      <h4 className="font-semibold text-orange-300">Move-Out Report</h4>

      {/* Condition selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-300">
          Exit Condition
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CONDITION_OPTIONS.map((opt) => {
            const selected = exitCondition === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExitCondition(opt.value)}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${opt.bg} ${
                  selected ? `ring-2 ${opt.ring}` : "hover:brightness-110"
                }`}
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${opt.dot} ${selected ? "opacity-100" : "opacity-50"}`}
                />
                <div>
                  <p className={`text-sm font-semibold ${opt.label_color}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-neutral-400">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional notes */}
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

      {/* Exit photos */}
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
