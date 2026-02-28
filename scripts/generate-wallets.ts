/**
 * Generate funded XRPL Devnet wallets for local development.
 *
 * Produces three wallets: landlord, tenant, notary.
 * Each is funded automatically via the Devnet faucet.
 *
 * Usage:
 *   pnpm tsx scripts/generate-wallets.ts
 */

import { Client, Wallet } from "xrpl";

const DEVNET_WSS = "wss://s.devnet.rippletest.net:51233";

async function fund(client: Client, wallet: Wallet, label: string) {
  console.log(`\nFunding ${label}…`);
  const result = await client.fundWallet(wallet);
  console.log(`  Address : ${result.wallet.address}`);
  console.log(`  Seed    : ${result.wallet.seed}`);
  console.log(`  Balance : ${result.balance} XRP`);
  return result.wallet;
}

async function main() {
  const client = new Client(DEVNET_WSS);
  await client.connect();
  console.log("Connected to XRPL Devnet");

  const landlord = await fund(client, Wallet.generate(), "Landlord");
  const tenant   = await fund(client, Wallet.generate(), "Tenant");
  const notary   = await fund(client, Wallet.generate(), "Notary");

  console.log("\n─────────────────────────────────────────────────────");
  console.log("Paste into the app (Connect Wallet → seed field):\n");
  console.log(`LANDLORD  ${landlord.seed}`);
  console.log(`TENANT    ${tenant.seed}`);
  console.log(`NOTARY    ${notary.seed}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("\nNotary address (for the lease form):");
  console.log(`  ${notary.address}`);
  console.log("\nFor the WASM contract, rebuild with:");
  console.log(`  r_address!("${notary.address}")`);

  await client.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
