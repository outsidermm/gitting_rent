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
    const { condition, fulfillment } = generateConditionPair();

    return ctx.db.lease.create({
      data: {
        landlordAddress: input.landlordAddress,
        propertyAddress: input.propertyAddress,
        tenantAddress: input.tenantAddress,
        notaryAddress: input.notaryAddress,
        bondAmountDrops,
        baselineCondition: input.baselineCondition,
        baselinePhotoUrls: input.baselinePhotoUrls,
        escrowCondition: condition,
        escrowFulfillment: fulfillment,
      },
    });
  });
