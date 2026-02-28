/**
 * XRPL transaction payload builders.
 *
 * These functions produce the unsigned transaction objects that callers
 * sign and submit. Keeping payload construction separate from the tRPC
 * router makes each piece testable in isolation.
 */

import type { EscrowCreate, EscrowFinish } from "xrpl";
import { xrpToDrops, dropsToXrp } from "xrpl";

// ─── epoch helpers ───────────────────────────────────────────────────────────

/** Seconds between Unix epoch (1970) and Ripple epoch (2000-01-01). */
const RIPPLE_EPOCH_OFFSET = 946_684_800;

/** Current time expressed in Ripple epoch seconds. */
export function nowRippleEpoch(): number {
  return Math.floor(Date.now() / 1000) - RIPPLE_EPOCH_OFFSET;
}

// ─── EscrowCreate ────────────────────────────────────────────────────────────

export interface EscrowCreateParams {
  tenantAddress: string;
  landlordAddress: string;
  bondAmountDrops: string;
  condition: string; // hex-encoded DER condition
}

/**
 * Build the unsigned EscrowCreate payload the tenant's browser will sign.
 *
 * Design choices:
 *   • No FinishAfter — with only a Condition present, the authorised notary
 *     can call EscrowFinish at any time by providing the fulfillment.
 *     Adding FinishAfter would block the notary until that time passes.
 *   • CancelAfter = 90 days — gives the tenant a guaranteed refund path if
 *     the notary is permanently unavailable.
 *   • Sequence / Fee / LastLedgerSequence are intentionally omitted — the
 *     client-side `autofill` fills these from live network state, preventing
 *     stale-nonce failures when there is latency between server and browser.
 */
export function buildEscrowCreatePayload(
  params: EscrowCreateParams,
): Partial<EscrowCreate> {
  const cancelAfter = nowRippleEpoch() + 90 * 24 * 60 * 60; // 90 days

  return {
    TransactionType: "EscrowCreate",
    Account: params.tenantAddress,
    Amount: params.bondAmountDrops,
    Destination: params.landlordAddress,
    Condition: params.condition,
    CancelAfter: cancelAfter,
  };
}

// ─── EscrowFinish ────────────────────────────────────────────────────────────

export interface EscrowFinishParams {
  notaryAddress: string;
  escrowOwnerAddress: string;
  escrowSequence: number;
  condition: string;
  fulfillment: string;
}

/**
 * Build the EscrowFinish transaction that the server submits on behalf of the
 * notary using their wallet seed.
 *
 * Note: Fee is deliberately omitted. EscrowFinish with a crypto-condition
 * requires a higher minimum fee than a standard transaction
 * (10 * ceil((33 + len(Fulfillment_bytes)) / 16) drops).
 * Passing the tx through `autofill` lets the library calculate this correctly.
 */
export function buildEscrowFinishPayload(
  params: EscrowFinishParams,
): EscrowFinish {
  return {
    TransactionType: "EscrowFinish",
    Account: params.notaryAddress,
    Owner: params.escrowOwnerAddress,
    OfferSequence: params.escrowSequence,
    Condition: params.condition,
    Fulfillment: params.fulfillment,
  };
}

// ─── re-exports ──────────────────────────────────────────────────────────────

export { xrpToDrops, dropsToXrp };
