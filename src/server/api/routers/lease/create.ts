/**
 * create — Landlord initiates a new lease.
 *
 * Generates a fresh PREIMAGE-SHA-256 condition pair on the server so the
 * secret fulfillment never touches the client.
 */

import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";
import { generateConditionPair } from "~/server/xrpl/condition";
import { xrpToDrops } from "~/server/xrpl/payloads";

export const create = publicProcedure
  .input(
    z.object({
      landlordAddress: z.string().min(25),
      propertyAddress: z.string().min(1),
      tenantAddress: z.string().min(25),
      notaryAddress: z.string().min(25),
      bondAmountXrp: z
        .string()
        .regex(/^\d+(\.\d+)?$/, "Must be a positive number"),
      baselineCondition: z.string().max(2000),
      baselinePhotoUrls: z.array(z.string().url()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const bondAmountDrops = xrpToDrops(input.bondAmountXrp);

    // Generate two independent condition pairs — one per escrow variant.
    // The penalty pair guards the landlord-destination escrow (Poor condition).
    // The refund pair guards the tenant-destination escrow (all other conditions).
    const penaltyPair = generateConditionPair();
    const refundPair = generateConditionPair();

    return ctx.db.lease.create({
      data: {
        landlordAddress: input.landlordAddress,
        propertyAddress: input.propertyAddress,
        tenantAddress: input.tenantAddress,
        notaryAddress: input.notaryAddress,
        bondAmountDrops,
        baselineCondition: input.baselineCondition,
        baselinePhotoUrls: input.baselinePhotoUrls,
        // Penalty escrow (Destination = landlord)
        escrowCondition: penaltyPair.condition,
        escrowFulfillment: penaltyPair.fulfillment,
        // Refund escrow (Destination = tenant)
        refundEscrowCondition: refundPair.condition,
        refundEscrowFulfillment: refundPair.fulfillment,
      },
    });
  });
