"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "~/context/WalletContext";
import type { Role } from "~/types/role";
import { LandlordView } from "./_components/LandlordView";
import { TenantView } from "./_components/TenantView";
import { NotaryView } from "./_components/NotaryView";

const ROLES: { id: Role; label: string; icon: string }[] = [
  { id: "landlord", label: "Landlord", icon: "🏠" },
  { id: "tenant", label: "Tenant", icon: "🔑" },
  { id: "notary", label: "Notary", icon: "⚖️" },
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
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-3">
        <span className="text-sm font-semibold tracking-tight">
          Smart Bond Return
        </span>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <span className="rounded-full border border-green-800 bg-green-900/30 px-3 py-0.5 font-mono text-xs text-green-400">
              {balance} XRP
            </span>
          )}
          <button
            onClick={() => void refreshBalance()}
            className="rounded-lg border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
            title="Refresh balance"
          >
            ↻
          </button>
          <span className="max-w-45 truncate rounded-full border border-neutral-700 bg-neutral-800 px-3 py-0.5 font-mono text-xs text-neutral-300">
            {address}
          </span>
          <button
            onClick={disconnect}
            className="rounded-lg border border-neutral-700 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
          >
            Disconnect
          </button>
        </div>
      </header>

      {/* Role tabs */}
      <nav className="border-b border-neutral-800 bg-neutral-950 px-6">
        <div className="flex gap-0">
          {ROLES.map((role) => (
            <button
              key={role.id}
              onClick={() => setRole(role.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
                activeRole === role.id
                  ? "border-white font-medium text-white"
                  : "border-transparent text-neutral-500 hover:text-neutral-300"
              }`}
            >
              <span>{role.icon}</span>
              {role.label}
            </button>
          ))}
        </div>
      </nav>

      {/* View content */}
      <main className="flex-1 px-6 py-8">
        {activeRole === "landlord" && <LandlordView />}
        {activeRole === "tenant" && <TenantView />}
        {activeRole === "notary" && <NotaryView />}
      </main>
    </div>
  );
}
