/**
 * approveRefund — Records the notary's approval after they submit the
 * EscrowFinish from their own browser (client-side signing).
 *
 * The EscrowFinish is signed and submitted entirely in the browser
 * (see EscrowFinishFlow.tsx), so the notary's seed never leaves their
 * device and no server-side XRPL connection is required.
 *
 *  This mutation just validates the caller and flips the lease status.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";

export const approveRefund = publicProcedure
  .input(
    z.object({
      leaseId: z.string(),
      callerAddress: z.string().min(25),
      /** Which escrow was settled on-chain: "refund" = tenant received bond, "penalty" = landlord received bond. */
      verdict: z.enum(["refund", "penalty"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.leaseId },
    });

    if (!lease) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (lease.notaryAddress !== input.callerAddress) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not authorised to perform this action.",
      });
    }

    if (lease.status !== "MOVE_OUT_PENDING") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This lease is not ready for approval.",
      });
    }

    return ctx.db.lease.update({
      where: { id: input.leaseId },
      data: {
        status: "APPROVED",
        // Persist the notary's verdict for audit trail and UI display
        approvedVerdict: input.verdict,
      },
    });
  });
