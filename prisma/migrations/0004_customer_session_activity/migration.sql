-- AlterTable
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
