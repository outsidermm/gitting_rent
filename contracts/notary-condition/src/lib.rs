//! # Notary-Condition Smart Escrow (XLS-100)
//!
//! WASM module for XRPL Smart Escrows. Authorises an `EscrowFinish` only
//! when the transaction is signed by the notary wallet specified at build time.
//!
//! ## Dual-verdict design
//!
//! Two variants of this binary are compiled per lease — one for each outcome:
//!
//!   `WASM_VERDICT=refund`  → funds go to the **tenant** on EscrowFinish
//!                            (condition rated Excellent / Good / Fair)
//!   `WASM_VERDICT=penalty` → funds go to the **landlord** on EscrowFinish
//!                            (condition rated Poor)
//!
//! The `IS_PENALTY` constant is baked in at compile time by `build.rs` and
//! emitted via a trace so the XLS-100 debugger can distinguish the two
//! binaries at runtime. The authorisation logic is identical: the EscrowFinish
//! must be signed by the designated notary account.
//!
//! ## How env vars flow from the web app
//!
//!   scripts/build-notary-wasm.ts --notary <address> --verdict refund|penalty
//!     → sets NOTARY_ADDRESS and WASM_VERDICT before invoking `cargo build`
//!     → build.rs generates notary_account.rs and verdict.rs in OUT_DIR
//!
//! ## Entry point
//!
//! `finish() -> i32`  called by the XLS-100 runtime on every EscrowFinish.
//!   1  → allow  (notary signed — release the bond)
//!   0  → deny   (anyone else — bond stays locked)
//!
//! ## Build
//!
//!   NOTARY_ADDRESS=rYourNotaryAddress WASM_VERDICT=refund \
//!     cargo build --target wasm32v1-none --release
//!
//!   Output: target/wasm32v1-none/release/notary_condition.wasm
//!
//! ## WASM devnet endpoint (standard devnet lacks XLS-100)
//!
//!   wss://wasm.devnet.rippletest.net:51233

#![cfg_attr(target_arch = "wasm32", no_std)]

#[cfg(not(target_arch = "wasm32"))]
extern crate std;

use xrpl_wasm_stdlib::core::current_tx::escrow_finish;
use xrpl_wasm_stdlib::core::current_tx::traits::TransactionCommonFields;
use xrpl_wasm_stdlib::host::trace::trace_num;
use xrpl_wasm_stdlib::host::{Result::Err, Result::Ok};
use xrpl_wasm_stdlib::r_address;

// ─── notary account (injected by build.rs from NOTARY_ADDRESS env var) ───────

include!(concat!(env!("OUT_DIR"), "/notary_account.rs"));

// ─── verdict (injected by build.rs from WASM_VERDICT env var) ────────────────
//
// IS_PENALTY = false → this is the refund escrow  (Destination = tenant)
// IS_PENALTY = true  → this is the penalty escrow (Destination = landlord)

include!(concat!(env!("OUT_DIR"), "/verdict.rs"));

// ─── entry point ─────────────────────────────────────────────────────────────

/// Called by the XLS-100 runtime for every EscrowFinish against this escrow.
///
/// Returns 1 (allow) if the EscrowFinish signer is the notary, 0 (deny) otherwise.
/// The verdict (refund vs penalty) is encoded in the binary itself and emitted
/// via trace so the runtime log identifies which escrow type was authorised.
#[unsafe(no_mangle)]
pub extern "C" fn finish() -> i32 {
    // Emit verdict so the XLS-100 debugger can identify this binary:
    //   0 = refund escrow authorised, 1 = penalty escrow authorised
    let _ = trace_num("verdict:is_penalty", IS_PENALTY as i64);

    let escrow_finish = escrow_finish::get_current_escrow_finish();

    let tx_account = match escrow_finish.get_account() {
        Ok(v) => v,
        Err(e) => {
            let _ = trace_num("Notary contract error", e.code() as i64);
            return e.code();
        }
    };

    (tx_account.0 == NOTARY_ACCOUNT) as i32
}
