/**
 * XRPL transaction payload builders.
 *
 * These functions produce the unsigned transaction objects that callers
 * sign and submit. Keeping payload construction separate from the tRPC
 * router makes each piece testable in isolation.
 */

import type { EscrowCreate, EscrowFinish, EscrowCancel } from "xrpl";
import { xrpToDrops } from "xrpl";

// ─── epoch helpers ───────────────────────────────────────────────────────────

/** Seconds between Unix epoch (1970) and Ripple epoch (2000-01-01). */
const RIPPLE_EPOCH_OFFSET = 946_684_800;

/** Current time expressed in Ripple epoch seconds. */
function nowRippleEpoch(): number {
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
 */
export function buildEscrowCreatePayload(
  params: EscrowCreateParams,
): Partial<EscrowCreate> {
  const cancelAfter = nowRippleEpoch() + 60; // 1 day

  return {
    TransactionType: "EscrowCreate",
    Account: params.tenantAddress,
    Amount: params.bondAmountDrops,
    Destination: params.landlordAddress, // penalty escrow: notary settles if condition is Poor
    Condition: params.condition,
    CancelAfter: cancelAfter,
  };
}

// ─── Refund EscrowCreate (Destination = tenant) ───────────────────────────────

export interface RefundEscrowCreateParams {
  tenantAddress: string;
  bondAmountDrops: string;
  condition: string; // hex-encoded DER condition for the refund path
}

/**
 * Build the unsigned EscrowCreate for the refund path.
 */
export function buildRefundEscrowCreatePayload(
  params: RefundEscrowCreateParams,
): Partial<EscrowCreate> {
  const cancelAfter = nowRippleEpoch() + 60; // 1 day

  return {
    TransactionType: "EscrowCreate",
    Account: params.tenantAddress,
    Amount: params.bondAmountDrops,
    Destination: params.tenantAddress, // refund escrow: notary settles if condition is acceptable
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

// ─── EscrowCancel ────────────────────────────────────────────────────────────

export interface EscrowCancelParams {
  tenantAddress: string;
  escrowSequence: number;
}

export function buildEscrowCancelPayload(
  params: EscrowCancelParams,
): EscrowCancel {
  return {
    TransactionType: "EscrowCancel",
    Account: params.tenantAddress,
    Owner: params.tenantAddress, // Tenant created the escrows
    OfferSequence: params.escrowSequence,
  };
}

export { xrpToDrops };