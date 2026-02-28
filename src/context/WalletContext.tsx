"use client";

/**
 * WalletContext
 *
 * Manages the connected XRPL wallet state client-side.
 * For the devnet MVP, users provide their wallet seed directly.
 * The seed is kept ONLY in memory (React state) — never persisted.
 *
 * Exports:
 *   useWallet()      — hook to read wallet state + actions
 *   WalletProvider   — wrap the app with this
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Wallet } from "xrpl";

export type Role = "landlord" | "tenant" | "notary";

interface WalletState {
  address: string | null;
  seed: string | null; // in-memory only; cleared on disconnect
  isConnected: boolean;
  activeRole: Role;
}

interface WalletContextValue extends WalletState {
  connect: (seed: string) => { address: string } | { error: string };
  disconnect: () => void;
  setRole: (role: Role) => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    seed: null,
    isConnected: false,
    activeRole: "landlord",
  });

  const connect = useCallback(
    (seed: string): { address: string } | { error: string } => {
      try {
        const wallet = Wallet.fromSeed(seed.trim());
        setState((prev) => ({
          ...prev,
          address: wallet.address,
          seed: seed.trim(),
          isConnected: true,
        }));
        return { address: wallet.address };
      } catch {
        return { error: "Invalid seed phrase or secret key." };
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    setState({
      address: null,
      seed: null,
      isConnected: false,
      activeRole: "landlord",
    });
  }, []);

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, activeRole: role }));
  }, []);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, setRole }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
