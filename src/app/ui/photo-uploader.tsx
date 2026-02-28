"use client";

import { useRef } from "react";
import { useUploadThing } from "~/lib/uploadthing";

interface PhotoUploaderProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  onError?: (message: string) => void;
}

export function PhotoUploader({ urls, onChange, onError }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("propertyImage", {
    onClientUploadComplete: (res) => {
      onChange([...urls, ...res.map((f) => f.ufsUrl)]);
    },
    onUploadError: () => {
      onError?.("Photo upload failed. Please try again.");
    },
  });

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files?.length) {
            await startUpload(Array.from(e.target.files));
            e.target.value = "";
          }
        }}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-dashed border-neutral-600 px-4 py-2.5 text-sm text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-300 disabled:opacity-50"
      >
        {isUploading ? "Uploading…" : "Upload photos"}
      </button>

      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-20 w-20 rounded-md border border-neutral-700 object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-xs text-neutral-300 ring-1 ring-neutral-700 hover:bg-red-950 hover:text-red-400"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
