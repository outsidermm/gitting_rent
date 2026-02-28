/**
 * Build the notary-condition WASM contract for a specific notary address.
 *
 * This script is the bridge between the web application and the Rust contract.
 * It receives a notary r-address (from the lease form / DB) and bakes it into
 * the compiled WASM binary via Cargo's NOTARY_ADDRESS env var → build.rs.
 *
 * Usage (CLI):
 *   pnpm tsx scripts/build-notary-wasm.ts --notary rYourNotaryAddress
 *
 * Usage (from tRPC / server code):
 *   import { buildNotaryWasm } from "~/scripts/build-notary-wasm"
 *   const { wasmHex, wasmPath } = await buildNotaryWasm("rYourNotaryAddress")
 *
 * Output:
 *   - WASM binary at contracts/notary-condition/output/<address>.wasm
 *   - Returns the hex-encoded binary (ready to upload to XRPL as SmartContract)
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, resolve, dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONTRACT_DIR = resolve(__dirname, "../contracts/notary-condition");
const OUTPUT_DIR = resolve(CONTRACT_DIR, "output");
const WASM_SRC = resolve(
  CONTRACT_DIR,
  "target/wasm32v1-none/release/notary_condition.wasm",
);

/** Build the WASM for the given notary address. Returns hex + output path. */
export async function buildNotaryWasm(notaryAddress: string): Promise<{
  wasmHex: string;
  wasmPath: string;
}> {
  if (!notaryAddress.startsWith("r") || notaryAddress.length < 25) {
    throw new Error(`Invalid XRPL address: ${notaryAddress}`);
  }

  // Resolve cargo binary (supports rustup installations)
  const cargoBin = resolveCargo();

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const destPath = join(OUTPUT_DIR, `${notaryAddress}.wasm`);

  console.log(`Building WASM contract for notary: ${notaryAddress}`);
  console.log(`Contract dir: ${CONTRACT_DIR}`);

  execSync(
    `${cargoBin} build --target wasm32v1-none --release`,
    {
      cwd: CONTRACT_DIR,
      env: { ...process.env, NOTARY_ADDRESS: notaryAddress },
      stdio: "inherit",
    },
  );

  if (!existsSync(WASM_SRC)) {
    throw new Error(`Build succeeded but WASM not found at: ${WASM_SRC}`);
  }

  copyFileSync(WASM_SRC, destPath);

  const wasmBytes = readFileSync(destPath);
  const wasmHex = wasmBytes.toString("hex").toUpperCase();

  console.log(`\nWASM built successfully:`);
  console.log(`  Path : ${destPath}`);
  console.log(`  Size : ${wasmBytes.length} bytes`);
  console.log(`  Hex  : ${wasmHex.slice(0, 40)}…`);

  return { wasmHex, wasmPath: destPath };
}

function resolveCargo(): string {
  const candidates = [
    `${process.env.HOME}/.cargo/bin/cargo`,
    "/usr/local/bin/cargo",
    "/opt/homebrew/bin/cargo",
    "cargo", // already on PATH
  ];
  for (const c of candidates) {
    try {
      execSync(`${c} --version`, { stdio: "ignore" });
      return c;
    } catch {
      // try next
    }
  }
  throw new Error(
    "cargo not found. Install Rust: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh",
  );
}

// ─── CLI entrypoint ───────────────────────────────────────────────────────────

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const notaryFlag = args.indexOf("--notary");

  if (notaryFlag === -1 || !args[notaryFlag + 1]) {
    console.error("Usage: pnpm tsx scripts/build-notary-wasm.ts --notary <r-address>");
    process.exit(1);
  }

  const notaryAddress = args[notaryFlag + 1]!;

  buildNotaryWasm(notaryAddress)
    .then(({ wasmHex, wasmPath }) => {
      console.log("\n─────────────────────────────────────────────────────");
      console.log("Add to EscrowCreate transaction:");
      console.log(`  SmartContract: "${wasmHex}"`);
      console.log("\nFile saved to:");
      console.log(`  ${wasmPath}`);
      console.log("─────────────────────────────────────────────────────");
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
