/**
 * confirmEscrow — Records an on-chain EscrowCreate the tenant just broadcast.
 *
 * Called by the browser after submitAndWait succeeds. The escrow sequence
 * number is required later by EscrowFinish.OfferSequence.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { publicProcedure } from "~/server/api/trpc";

export const confirmEscrow = publicProcedure
  .input(
    z.object({
      leaseId: z.string(),
      /** Sequence number of the confirmed penalty EscrowCreate (Destination = landlord). */
      escrowSequence: z.number().int().positive(),
      /** Sequence number of the confirmed refund EscrowCreate (Destination = tenant). */
      refundEscrowSequence: z.number().int().positive(),
      /** XRPL address of the account that issued both EscrowCreate txs (the tenant). */
      escrowOwnerAddress: z.string().min(25),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const lease = await ctx.db.lease.findUnique({
      where: { id: input.leaseId },
    });

    if (!lease) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    if (lease.status !== "PENDING_ESCROW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This action cannot be completed at the current stage.",
      });
    }

    return ctx.db.lease.update({
      where: { id: input.leaseId },
      data: {
        escrowSequence: input.escrowSequence,
        refundEscrowSequence: input.refundEscrowSequence,
        escrowOwnerAddress: input.escrowOwnerAddress,
        status: "ESCROWED",
      },
    });
  });
