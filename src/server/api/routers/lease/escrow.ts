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
      /** Sequence number of the confirmed EscrowCreate transaction. */
      escrowSequence: z.number().int().positive(),
      /** XRPL address of the account that issued the EscrowCreate (the tenant). */
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
        message: `Cannot confirm escrow — current status is "${lease.status}".`,
      });
    }

    return ctx.db.lease.update({
      where: { id: input.leaseId },
      data: {
        escrowSequence: input.escrowSequence,
        escrowOwnerAddress: input.escrowOwnerAddress,
        status: "ESCROWED",
      },
    });
  });
