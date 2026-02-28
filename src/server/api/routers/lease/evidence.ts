/**
 * submitEvidence — Tenant submits move-out photos and condition report.
 *
 * Transitions the lease from ESCROWED → MOVE_OUT_PENDING.
 * Evidence can only be submitted once per lease.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";

export const submitEvidence = publicProcedure
  .input(
    z.object({
      leaseId: z.string(),
      /** Must match the lease's tenantAddress — used as a caller identity check. */
      callerAddress: z.string().min(25),
      exitCondition: z.string().min(1),
      exitPhotoUrls: z.array(z.string().url()),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.leaseId },
      include: { evidence: true },
    });

    if (!lease) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (lease.tenantAddress !== input.callerAddress) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not authorised to perform this action.",
      });
    }

    if (lease.status !== "ESCROWED") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Move-out evidence cannot be submitted at this stage.",
      });
    }

    if (lease.evidence) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Move-out evidence has already been submitted.",
      });
    }

    // Atomic: update lease status and create evidence record together.
    const [updatedLease] = await ctx.db.$transaction([
      ctx.db.lease.update({
        where: { id: input.leaseId },
        data: { status: "MOVE_OUT_PENDING" },
      }),
      ctx.db.evidence.create({
        data: {
          leaseId: input.leaseId,
          exitCondition: input.exitCondition,
          exitPhotoUrls: input.exitPhotoUrls,
        },
      }),
    ]);

    return updatedLease;
  });
