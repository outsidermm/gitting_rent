import { useState } from "react";
import { Client, Wallet, type EscrowCancel } from "xrpl";
import { DEVNET_WSS } from "~/app/constants";
import { useWallet } from "~/context/WalletContext";

export function EscrowCancelFlow({ sequence }: { sequence: number }) {
  const { seed, address, refreshBalance } = useWallet();
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [error, setError] = useState("");

  async function handleCancel() {
    if (!seed || !address) return;
    setStatus("processing");
    setError("");

    let client: Client | null = null;
    try {
      const wallet = Wallet.fromSeed(seed);
      client = new Client(DEVNET_WSS);
      await client.connect();

      const tx: EscrowCancel = {
        TransactionType: "EscrowCancel",
        Account: address,
        Owner: address,
        OfferSequence: sequence,
      };

      const prepared = await client.autofill(tx);
      const { tx_blob, hash } = wallet.sign(prepared);
      const result = await client.submitAndWait(tx_blob);

      const meta = result.result.meta as
        | { TransactionResult?: string }
        | undefined;
      const txResult = meta?.TransactionResult;

      if (txResult !== "tesSUCCESS") {
        if (txResult === "tecNO_TARGET") {
          // Escrow no longer exists, it was likely already successfully cancelled
          setStatus("done");
          return;
        }
        if (txResult === "tecNO_PERMISSION") {
          throw new Error(
            "The 1 minute expiry period has not passed yet. Please try again later.",
          );
        }
        throw new Error(`Failed to claim: ${txResult}`);
      }

      await refreshBalance();
      setStatus("done");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStatus("idle");
    } finally {
      if (client?.isConnected()) await client.disconnect();
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-green-400">
        ✓ Unused funds successfully recovered to your wallet.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg bg-neutral-800/40 p-3">
      <div className="space-y-1.5 text-xs text-neutral-400">
        <p className="font-semibold text-neutral-300">
          Unused Deposit Recovery
        </p>
        <p>
          You have unused funds locked in the alternate escrow. You can recover
          them once the 1 minute lock period expires.
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        onClick={() => void handleCancel()}
        disabled={status !== "idle" || !seed}
        className="rounded-lg bg-neutral-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-600 disabled:opacity-50"
      >
        {status === "processing" ? "Processing..." : "Claim Unused Deposit"}
      </button>
    </div>
  );
}
