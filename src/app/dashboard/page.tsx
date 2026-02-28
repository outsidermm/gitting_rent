"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "~/context/WalletContext";
import type { Role } from "~/types/role";
import { LandlordView } from "./_components/LandlordView";
import { TenantView } from "./_components/TenantView";
import { NotaryView } from "./_components/NotaryView";

const ROLES: { id: Role; label: string }[] = [
  { id: "landlord", label: "Landlord" },
  { id: "tenant", label: "Tenant" },
  { id: "notary", label: "Notary" },
];

export default function DashboardPage() {
  const {
    isConnected,
    address,
    activeRole,
    setRole,
    disconnect,
    balance,
    refreshBalance,
  } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) router.push("/");
  }, [isConnected, router]);

  useEffect(() => {
    if (address) {
      void refreshBalance();
    }
  }, [address, refreshBalance]);

  if (!isConnected || !address) return null;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <div className="sticky top-0 z-50 shadow-lg shadow-black/40">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-neutral-700/50 bg-neutral-800 px-6 py-3">
          <span className="text-sm font-semibold tracking-tight text-neutral-100">
            Smart Bond Return
          </span>
          <div className="flex items-center gap-3">
            {balance !== null && (
              <span className="rounded-full border border-green-700/60 bg-green-900/30 px-3 py-0.5 font-mono text-xs text-green-400">
                {balance} XRP
              </span>
            )}
            <button
              onClick={() => void refreshBalance()}
              className="rounded-lg border border-neutral-600 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-400 hover:text-neutral-100"
              title="Refresh balance"
            >
              ↻
            </button>
            <span className="max-w-45 truncate rounded-full border border-neutral-600 bg-neutral-700/50 px-3 py-0.5 font-mono text-xs text-neutral-200">
              {address}
            </span>
            <button
              onClick={disconnect}
              className="rounded-lg border border-neutral-600 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-400 hover:text-neutral-100"
            >
              Disconnect
            </button>
          </div>
        </header>

        {/* Role tabs */}
        <nav className="border-b border-neutral-700/40 bg-[#1f1f1f] px-6">
          <div className="flex gap-0">
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => setRole(role.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
                  activeRole === role.id
                    ? "border-neutral-100 font-medium text-white"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {role.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* View content */}
      <main className="flex-1 px-8 py-8 lg:px-12">
        {activeRole === "landlord" && <LandlordView />}
        {activeRole === "tenant" && <TenantView />}
        {activeRole === "notary" && <NotaryView />}
      </main>
    </div>
  );
}
