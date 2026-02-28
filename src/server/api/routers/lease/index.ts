/**
 * Lease tRPC router — assembles all sub-procedures.
 *
 * Mutations:
 *   lease.create                 → landlord creates a lease
 *   lease.confirmEscrow          → tenant records confirmed on-chain escrow
 *   lease.submitEvidence         → tenant submits move-out evidence
 *   lease.approveRefund          → notary releases the bond via EscrowFinish
 *
 * Queries:
 *   lease.getEscrowCreatePayload → unsigned EscrowCreate tx for tenant to sign
 *   lease.getByAddress           → all leases for a given XRPL address
 *   lease.getById                → single lease with evidence
 */

import { createTRPCRouter } from "~/server/api/trpc";

import { create } from "./create";
import { confirmEscrow } from "./escrow";
import { submitEvidence } from "./evidence";
import { approveRefund } from "./approve";
import { getEscrowCreatePayload, getEscrowFinishPayload, getByAddress, getById } from "./queries";

export const leaseRouter = createTRPCRouter({
  create,
  confirmEscrow,
  submitEvidence,
  approveRefund,
  getEscrowCreatePayload,
  getEscrowFinishPayload,
  getByAddress,
  getById,
});
