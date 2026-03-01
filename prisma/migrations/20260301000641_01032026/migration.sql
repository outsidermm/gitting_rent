/*
  Warnings:

  - Added the required column `propertyAddress` to the `Lease` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lease" ADD COLUMN     "approvedVerdict" TEXT,
ADD COLUMN     "propertyAddress" TEXT NOT NULL,
ADD COLUMN     "refundEscrowCondition" TEXT,
ADD COLUMN     "refundEscrowFulfillment" TEXT,
ADD COLUMN     "refundEscrowSequence" INTEGER;
