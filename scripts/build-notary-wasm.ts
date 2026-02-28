/**
 * Build the notary-condition WASM contract for a specific notary address and
 * verdict (refund or penalty).
 *
 * Two variants are built per lease:
 *   verdict="refund"  → Destination=tenant   (Excellent/Good/Fair outcome)
 *   verdict="penalty" → Destination=landlord (Poor outcome)
 *
 * The variant is baked into the binary via WASM_VERDICT → build.rs → verdict.rs.
 *
 * Usage (CLI):
 *   pnpm tsx scripts/build-notary-wasm.ts --notary rAddr --verdict refund
 *   pnpm tsx scripts/build-notary-wasm.ts --notary rAddr --verdict penalty
 *
 * Usage (from tRPC / server code):
 *   import { buildNotaryWasm } from "~/scripts/build-notary-wasm"
 *   const { wasmHex } = await buildNotaryWasm("rAddr", "refund")
 *   const { wasmHex } = await buildNotaryWasm("rAddr", "penalty")
 *
 * Output:
 *   - WASM binary at contracts/notary-condition/output/<address>-<verdict>.wasm
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

export type WasmVerdict = "refund" | "penalty";

/** Build the WASM for the given notary address and verdict. Returns hex + output path. */
export async function buildNotaryWasm(
  notaryAddress: string,
  verdict: WasmVerdict = "refund",
): Promise<{
  wasmHex: string;
  wasmPath: string;
}> {
  if (!notaryAddress.startsWith("r") || notaryAddress.length < 25) {
    throw new Error(`Invalid XRPL address: ${notaryAddress}`);
  }
  if (verdict !== "refund" && verdict !== "penalty") {
    throw new Error(`verdict must be "refund" or "penalty", got: ${verdict}`);
  }

  const cargoBin = resolveCargo();
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const destPath = join(OUTPUT_DIR, `${notaryAddress}-${verdict}.wasm`);

  console.log(`Building WASM contract — notary: ${notaryAddress}, verdict: ${verdict}`);
  console.log(`Contract dir: ${CONTRACT_DIR}`);

  execSync(
    `${cargoBin} build --target wasm32v1-none --release`,
    {
      cwd: CONTRACT_DIR,
      env: { ...process.env, NOTARY_ADDRESS: notaryAddress, WASM_VERDICT: verdict },
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
  console.log(`  Path    : ${destPath}`);
  console.log(`  Verdict : ${verdict}`);
  console.log(`  Size    : ${wasmBytes.length} bytes`);
  console.log(`  Hex     : ${wasmHex.slice(0, 40)}…`);

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
  const verdictFlag = args.indexOf("--verdict");

  if (notaryFlag === -1 || !args[notaryFlag + 1]) {
    console.error(
      "Usage: pnpm tsx scripts/build-notary-wasm.ts --notary <r-address> [--verdict refund|penalty]",
    );
    process.exit(1);
  }

  const notaryAddress = args[notaryFlag + 1]!;
  const rawVerdict = verdictFlag !== -1 ? args[verdictFlag + 1] : "refund";
  if (rawVerdict !== "refund" && rawVerdict !== "penalty") {
    console.error(`--verdict must be "refund" or "penalty", got: ${rawVerdict ?? "(none)"}`);
    process.exit(1);
  }
  const verdict: WasmVerdict = rawVerdict;

  buildNotaryWasm(notaryAddress, verdict)
    .then(({ wasmHex, wasmPath }) => {
      console.log("\n─────────────────────────────────────────────────────");
      console.log(`Add to EscrowCreate transaction (${verdict} escrow):`);
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
