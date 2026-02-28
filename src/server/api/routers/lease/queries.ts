/**
 * Read-only tRPC procedures for the Lease router.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";
import {
  buildEscrowCreatePayload,
  buildEscrowFinishPayload,
} from "~/server/xrpl/payloads";
import { verifyConditionPair } from "~/server/xrpl/condition";

// ─── getEscrowCreatePayload ──────────────────────────────────────────────────

/**
 * Returns the unsigned EscrowCreate transaction for a tenant to sign
 * in their browser. Also returns the lease record for display.
 *
 * The condition is verified before returning so a broken DB record is caught
 * early rather than surfacing as an on-chain temMALFORMED.
 */
export const getEscrowCreatePayload = publicProcedure
  .input(z.object({ leaseId: z.string() }))
  .query(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.leaseId },
    });

    if (!lease) throw new TRPCError({ code: "NOT_FOUND" });

    if (lease.status !== "PENDING_ESCROW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Lease is not awaiting escrow (current status: ${lease.status}).`,
      });
    }

    if (!lease.escrowCondition || !lease.escrowFulfillment) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Lease is missing crypto-condition data.",
      });
    }

    // Verify the stored condition/fulfillment pair before handing it to the
    // client — a mismatch would cause temMALFORMED or tecCRYPTOCONDITION_ERROR.
    const pairValid = verifyConditionPair({
      condition: lease.escrowCondition,
      fulfillment: lease.escrowFulfillment,
    });

    if (!pairValid) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          "Stored crypto-condition is corrupt. Recreate the lease to generate a fresh pair.",
      });
    }

    const tx = buildEscrowCreatePayload({
      tenantAddress: lease.tenantAddress,
      landlordAddress: lease.landlordAddress,
      bondAmountDrops: lease.bondAmountDrops,
      condition: lease.escrowCondition,
    });

    return { tx, lease };
  });

// ─── getEscrowFinishPayload ───────────────────────────────────────────────────

/**
 * Returns the unsigned EscrowFinish transaction for the notary to sign
 * client-side. Includes the fulfillment — this is intentional, as only the
 * designated notary (verified by callerAddress) may retrieve it.
 */
export const getEscrowFinishPayload = publicProcedure
  .input(z.object({ leaseId: z.string(), callerAddress: z.string().min(25) }))
  .query(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.leaseId },
      include: { evidence: true },
    });

    if (!lease) throw new TRPCError({ code: "NOT_FOUND" });

    if (lease.notaryAddress !== input.callerAddress) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Only the designated notary may retrieve the EscrowFinish payload.",
      });
    }

    if (lease.status !== "MOVE_OUT_PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Lease is not awaiting notary approval (status: ${lease.status}).`,
      });
    }

    const {
      escrowSequence,
      escrowOwnerAddress,
      escrowCondition,
      escrowFulfillment,
    } = lease;

    if (
      !escrowSequence ||
      !escrowOwnerAddress ||
      !escrowCondition ||
      !escrowFulfillment
    ) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Escrow metadata is incomplete on this lease record.",
      });
    }

    const tx = buildEscrowFinishPayload({
      notaryAddress: input.callerAddress,
      escrowOwnerAddress,
      escrowSequence,
      condition: escrowCondition,
      fulfillment: escrowFulfillment,
    });

    return { tx, lease };
  });

// ─── getByAddress ─────────────────────────────────────────────────────────────

/** All leases where the given XRPL address is landlord, tenant, or notary. */
export const getByAddress = publicProcedure
  .input(z.object({ address: z.string() }))
  .query(({ ctx, input }) => {
    if (!input.address) return [];
    return ctx.db.lease.findMany({
      where: {
        OR: [
          { landlordAddress: input.address },
          { tenantAddress: input.address },
          { notaryAddress: input.address },
        ],
      },
      include: { evidence: true },
      orderBy: { createdAt: "desc" },
    });
  });

// ─── getById ─────────────────────────────────────────────────────────────────

export const getById = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.id },
      include: { evidence: true },
    });
    if (!lease) throw new TRPCError({ code: "NOT_FOUND" });
    return lease;
  });
