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

import { Client, Wallet, dropsToXrp } from "xrpl";
import { DEVNET_WSS } from "~/app/constants";
import type { Role } from "~/types/role";

interface WalletState {
  address: string | null;
  seed: string | null;
  isConnected: boolean;
  activeRole: Role;
  balance: string | null;
}

interface WalletContextValue extends WalletState {
  connect: (seed: string) => { address: string } | { error: string };
  disconnect: () => void;
  setRole: (role: Role) => void;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

async function fetchBalance(address: string): Promise<string> {
  const client = new Client(DEVNET_WSS);
  try {
    await client.connect();
    const accountInfo = await client.request({
      command: "account_info",
      account: address,
    });
    const balanceXrp = dropsToXrp(
      accountInfo.result.account_data.Balance,
    ).toString();
    return balanceXrp;
  } catch (e: unknown) {
    if (
      typeof e === "object" &&
      e !== null &&
      "result" in e &&
      typeof e.result === "object" &&
      e.result !== null &&
      "error" in e.result &&
      e.result.error === "actNotFound"
    ) {
      return "0.00";
    }
    console.warn("Balance fetch error:", e);
    return "0.00";
  } finally {
    await client.disconnect();
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    seed: null,
    isConnected: false,
    activeRole: "landlord",
    balance: null,
  });

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;
    try {
      const balance = await fetchBalance(state.address);
      setState((prev) => ({ ...prev, balance }));
    } catch (e) {
      console.error("Failed to fetch balance:", e);
    }
  }, [state.address]);

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
      balance: null,
    });
  }, []);

  const setRole = useCallback((role: Role) => {
    setState((prev) => ({ ...prev, activeRole: role }));
  }, []);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, setRole, refreshBalance }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}
