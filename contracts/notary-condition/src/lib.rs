//! # Notary-Condition Smart Escrow (XLS-100)
//!
//! WASM module for XRPL Smart Escrows. Authorises an `EscrowFinish` only
//! when the transaction is signed by the notary wallet specified at build time.
//!
//! ## How the notary address flows from the web app
//!
//! The web app calls `scripts/build-notary-wasm.ts --notary <address>`, which
//! sets the `NOTARY_ADDRESS` environment variable before invoking `cargo build`.
//! `build.rs` reads that variable and generates `notary_account.rs` in `OUT_DIR`,
//! which this file includes. The address is baked into the WASM binary.
//!
//! ## Entry point
//!
//! `finish() -> i32`  called by the XLS-100 runtime on every EscrowFinish.
//!   1  → allow  (notary signed — release the bond)
//!   0  → deny   (anyone else — bond stays locked)
//!
//! ## Build
//!
//!   NOTARY_ADDRESS=rYourNotaryAddress \
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

// ─── entry point ─────────────────────────────────────────────────────────────

/// Called by the XLS-100 runtime for every EscrowFinish against this escrow.
///
/// Returns 1 (allow) if the EscrowFinish signer is the notary, 0 (deny) otherwise.
#[unsafe(no_mangle)]
pub extern "C" fn finish() -> i32 {
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
