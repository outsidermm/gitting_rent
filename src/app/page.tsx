"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "~/context/WalletContext";

export default function HomePage() {
  const { connect, isConnected } = useWallet();
  const router = useRouter();
  const [seed, setSeed] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected) router.push("/dashboard");
  }, [isConnected, router]);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!seed.trim()) return;
    setLoading(true);
    setError("");

    setTimeout(() => {
      const result = connect(seed);
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    }, 0);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="space-y-2 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-2xl">
            🔐
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Smart Bond Return
          </h1>
          <p className="text-sm text-neutral-400">
            Decentralised rental deposits on the XRP Ledger
          </p>
        </div>

        {/* Role pills */}
        <div className="flex justify-center gap-2">
          {(["Landlord", "Tenant", "Notary"] as const).map((r) => (
            <span
              key={r}
              className="rounded-full border border-neutral-700 px-3 py-0.5 text-xs text-neutral-400"
            >
              {r}
            </span>
          ))}
        </div>

        {/* Connect form */}
        <form
          onSubmit={handleConnect}
          className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <div className="space-y-1.5">
            <label
              htmlFor="seed"
              className="block text-sm font-medium text-neutral-300"
            >
              Devnet Wallet Seed
            </label>
            <input
              id="seed"
              type="password"
              autoComplete="off"
              placeholder="sXXXXXXXXXXXXXXXXXXXXXX"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500 focus:ring-0"
            />
            <p className="text-xs text-neutral-500">
              Stored in memory only. Use an XRPL Devnet wallet —{" "}
              <a
                href="https://faucet.devnet.rippletest.net/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 underline underline-offset-2"
              >
                get one free here
              </a>
              .
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !seed.trim()}
            className="w-full rounded-lg bg-neutral-100 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Connecting…" : "Connect Wallet"}
          </button>
        </form>

        <p className="text-center text-xs text-neutral-600">
          XRPL Devnet — not for real funds
        </p>
      </div>
    </main>
  );
}
