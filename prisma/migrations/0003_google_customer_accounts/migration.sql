-- AlterTable
ALTER TABLE "CustomerAccount" DROP COLUMN IF EXISTS "passwordHash";

-- AlterTable
ALTER TABLE "CustomerAccount" ADD COLUMN IF NOT EXISTS "provider" TEXT NOT NULL DEFAULT 'google';
