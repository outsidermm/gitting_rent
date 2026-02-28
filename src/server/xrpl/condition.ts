/**
 * PREIMAGE-SHA-256 crypto-condition encoding for XRPL escrow.
 *
 * Spec: draft-thomas-crypto-conditions-04
 * XRPL reference condition (empty preimage):
 *   Fulfillment: A0028000
 *   Condition:   A0258020E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855810100
 *
 * For a 32-byte preimage the layout is:
 *
 *   Fulfillment  =  A0  22  80  20  {32-byte preimage}
 *                   ↑   ↑   ↑   ↑
 *                   tag len tag len(32)
 *
 *   Condition    =  A0  25  80  20  {SHA-256(preimage)}  81  01  20
 *                   ↑   ↑   ↑   ↑                        ↑   ↑   ↑
 *                   tag len tag len(32)                   tag len cost=32
 *
 * Key rule: the fingerprint is SHA-256 of the RAW preimage bytes,
 * NOT SHA-256 of the fulfillment encoding.
 */

import crypto from "crypto";

export interface ConditionPair {
  /** Hex-encoded DER condition — goes in EscrowCreate.Condition */
  condition: string;
  /** Hex-encoded DER fulfillment — goes in EscrowFinish.Fulfillment */
  fulfillment: string;
}

// ─── encoding constants ──────────────────────────────────────────────────────

const FULFILLMENT_PREFIX = Buffer.from([
  0xa0, // tag: context-specific, constructed, PREIMAGE-SHA-256
  0x22, // content length = 2 (inner tag+len) + 32 (preimage) = 34
  0x80, // inner tag: preimage field
  0x20, // inner length: 32 bytes
]);

const CONDITION_PREFIX = Buffer.from([
  0xa0, // tag
  0x25, // content length = 2 + 32 (fingerprint) + 3 (cost field) = 37
  0x80, // fingerprint tag
  0x20, // fingerprint length: 32 bytes
]);

// Cost field for a 32-byte preimage: cost = len(preimage) = 32 = 0x20
// Minimal DER integer encoding: 1 byte → 81 01 20
const COST_FIELD = Buffer.from([0x81, 0x01, 0x20]);

// ─── public API ──────────────────────────────────────────────────────────────

/** Generate a fresh condition/fulfillment pair backed by a random 32-byte preimage. */
export function generateConditionPair(): ConditionPair {
  const preimage = crypto.randomBytes(32);
  return encodeConditionPair(preimage);
}

/**
 * Encode a condition/fulfillment pair from a given preimage.
 * Exported for testing with known preimages.
 */
export function encodeConditionPair(preimage: Buffer): ConditionPair {
  const fulfillment = Buffer.concat([FULFILLMENT_PREFIX, preimage]);

  // Fingerprint = SHA-256 of the raw preimage (not the fulfillment wrapper)
  const fingerprint = crypto.createHash("sha256").update(preimage).digest();
  const condition = Buffer.concat([CONDITION_PREFIX, fingerprint, COST_FIELD]);

  return {
    condition: condition.toString("hex").toUpperCase(),
    fulfillment: fulfillment.toString("hex").toUpperCase(),
  };
}

/**
 * Verify that a stored condition/fulfillment pair is internally consistent.
 * Call this after loading from DB to catch any encoding regressions.
 *
 * Returns `true` if the pair is valid, `false` otherwise.
 */
export function verifyConditionPair(pair: ConditionPair): boolean {
  try {
    const f = Buffer.from(pair.fulfillment, "hex");
    const c = Buffer.from(pair.condition, "hex");

    // Fulfillment structure checks
    if (f.length !== 36) return false;
    if (f[0] !== 0xa0 || f[1] !== 0x22 || f[2] !== 0x80 || f[3] !== 0x20)
      return false;

    const preimage = f.subarray(4, 36);

    // Condition structure checks
    if (c.length !== 39) return false;
    if (c[0] !== 0xa0 || c[1] !== 0x25 || c[2] !== 0x80 || c[3] !== 0x20)
      return false;

    const expectedFingerprint = crypto
      .createHash("sha256")
      .update(preimage)
      .digest();
    const actualFingerprint = c.subarray(4, 36);
    if (!actualFingerprint.equals(expectedFingerprint)) return false;

    // Cost field: 81 01 20
    if (c[36] !== 0x81 || c[37] !== 0x01 || c[38] !== 0x20) return false;

    return true;
  } catch {
    return false;
  }
}
