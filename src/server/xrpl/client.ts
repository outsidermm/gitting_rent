/**
 * XRPL Devnet client — process-level singleton.
 *
 * Uses globalThis to survive Next.js hot-reloads in development without
 * accumulating open WebSocket connections.
 */

import { Client } from "xrpl";

export const DEVNET_WSS = "wss://wasm.devnet.rippletest.net:51233";

declare global {
  var __xrplClient: Client | undefined;
}

export const xrplClient: Client =
  globalThis.__xrplClient ?? new Client(DEVNET_WSS, { connectionTimeout: 20_000 });

if (process.env.NODE_ENV !== "production") {
  globalThis.__xrplClient = xrplClient;
}

/** Connect lazily; safe to call if already connected. */
export async function ensureConnected(): Promise<Client> {
  if (!xrplClient.isConnected()) {
    await xrplClient.connect();
  }
  return xrplClient;
}
