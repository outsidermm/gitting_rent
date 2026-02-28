-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeaseStatus" AS ENUM ('PENDING_ESCROW', 'ESCROWED', 'MOVE_OUT_PENDING', 'APPROVED');

-- CreateTable
CREATE TABLE "Lease" (
    "id" TEXT NOT NULL,
    "landlordAddress" TEXT NOT NULL,
    "tenantAddress" TEXT NOT NULL,
    "notaryAddress" TEXT NOT NULL,
    "bondAmountDrops" TEXT NOT NULL,
    "baselineCondition" TEXT NOT NULL,
    "baselinePhotoUrls" TEXT[],
    "escrowSequence" INTEGER,
    "escrowOwnerAddress" TEXT,
    "escrowCondition" TEXT,
    "escrowFulfillment" TEXT,
    "status" "LeaseStatus" NOT NULL DEFAULT 'PENDING_ESCROW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "exitCondition" TEXT NOT NULL,
    "exitPhotoUrls" TEXT[],
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lease_landlordAddress_idx" ON "Lease"("landlordAddress");

-- CreateIndex
CREATE INDEX "Lease_tenantAddress_idx" ON "Lease"("tenantAddress");

-- CreateIndex
CREATE INDEX "Lease_notaryAddress_idx" ON "Lease"("notaryAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Evidence_leaseId_key" ON "Evidence"("leaseId");

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
