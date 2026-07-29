-- Secure manufacturing order lifecycle: payment, fulfillment, disputes and payouts.
ALTER TYPE "ManufacturingOrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_PAYMENT';
ALTER TYPE "ManufacturingOrderStatus" ADD VALUE IF NOT EXISTS 'IN_PRODUCTION';
ALTER TYPE "ManufacturingOrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "ManufacturingOrderStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "ManufacturingOrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

CREATE TYPE "ManufacturingPaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED');
CREATE TYPE "ManufacturingPayoutStatus" AS ENUM ('NOT_READY', 'READY_FOR_REVIEW', 'ON_HOLD', 'PAID', 'CANCELLED');
CREATE TYPE "ManufacturingDisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');
CREATE TYPE "ManufacturingOrderEventType" AS ENUM (
  'OFFER_SELECTED', 'PROVIDER_RESPONDED', 'CUSTOMER_ACCEPTED', 'PAYMENT_CREATED',
  'PAYMENT_CONFIRMED', 'PRODUCTION_STARTED', 'DELIVERY_DECLARED', 'CUSTOMER_RECEIVED',
  'DISPUTE_OPENED', 'DISPUTE_RESOLVED', 'PAYOUT_READY', 'PAYOUT_HELD', 'PAYOUT_PAID', 'ORDER_CANCELLED'
);

ALTER TABLE "ManufacturingOrder"
  ADD COLUMN "recommendedLeadTimeDays" INTEGER,
  ADD COLUMN "commissionPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN "commissionBob" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "payoutBob" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paymentDueAt" TIMESTAMP(3),
  ADD COLUMN "productionStartedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "deliveryNotes" TEXT,
  ADD COLUMN "customerResponseDueAt" TIMESTAMP(3),
  ADD COLUMN "receivedAt" TIMESTAMP(3);

CREATE TABLE "ManufacturingOrderRevision" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "totalBob" DECIMAL(12,2) NOT NULL,
  "leadTimeDays" INTEGER NOT NULL,
  "recommendedLeadTimeDays" INTEGER NOT NULL,
  "commissionPercent" DECIMAL(6,2) NOT NULL,
  "commissionBob" DECIMAL(12,2) NOT NULL,
  "payoutBob" DECIMAL(12,2) NOT NULL,
  "reason" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  CONSTRAINT "ManufacturingOrderRevision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingPayment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MOCK',
  "providerReference" TEXT NOT NULL,
  "status" "ManufacturingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amountBob" DECIMAL(12,2) NOT NULL,
  "qrPayload" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "paidAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "providerPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingConversation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "manufacturerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderAccountId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManufacturingMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingDispute" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "status" "ManufacturingDisputeStatus" NOT NULL DEFAULT 'OPEN',
  "reason" TEXT NOT NULL,
  "adminNotes" TEXT,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedByEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingDispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingPayout" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" "ManufacturingPayoutStatus" NOT NULL DEFAULT 'NOT_READY',
  "grossBob" DECIMAL(12,2) NOT NULL,
  "commissionBob" DECIMAL(12,2) NOT NULL,
  "netBob" DECIMAL(12,2) NOT NULL,
  "holdReason" TEXT,
  "paidAt" TIMESTAMP(3),
  "paidByEmail" TEXT,
  "paymentReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManufacturingPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ManufacturingOrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "ManufacturingOrderEventType" NOT NULL,
  "actorAccountId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManufacturingOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManufacturingPayment_orderId_key" ON "ManufacturingPayment"("orderId");
CREATE UNIQUE INDEX "ManufacturingPayment_providerReference_key" ON "ManufacturingPayment"("providerReference");
CREATE UNIQUE INDEX "ManufacturingConversation_orderId_key" ON "ManufacturingConversation"("orderId");
CREATE UNIQUE INDEX "ManufacturingDispute_orderId_key" ON "ManufacturingDispute"("orderId");
CREATE UNIQUE INDEX "ManufacturingPayout_orderId_key" ON "ManufacturingPayout"("orderId");
CREATE INDEX "ManufacturingOrder_customerResponseDueAt_idx" ON "ManufacturingOrder"("customerResponseDueAt");
CREATE INDEX "ManufacturingOrderRevision_orderId_submittedAt_idx" ON "ManufacturingOrderRevision"("orderId", "submittedAt");
CREATE INDEX "ManufacturingPayment_status_expiresAt_idx" ON "ManufacturingPayment"("status", "expiresAt");
CREATE INDEX "ManufacturingConversation_customerId_idx" ON "ManufacturingConversation"("customerId");
CREATE INDEX "ManufacturingConversation_manufacturerId_idx" ON "ManufacturingConversation"("manufacturerId");
CREATE INDEX "ManufacturingMessage_conversationId_createdAt_idx" ON "ManufacturingMessage"("conversationId", "createdAt");
CREATE INDEX "ManufacturingDispute_status_createdAt_idx" ON "ManufacturingDispute"("status", "createdAt");
CREATE INDEX "ManufacturingPayout_status_createdAt_idx" ON "ManufacturingPayout"("status", "createdAt");
CREATE INDEX "ManufacturingOrderEvent_orderId_createdAt_idx" ON "ManufacturingOrderEvent"("orderId", "createdAt");
CREATE INDEX "ManufacturingOrderEvent_type_createdAt_idx" ON "ManufacturingOrderEvent"("type", "createdAt");

ALTER TABLE "ManufacturingOrderRevision" ADD CONSTRAINT "ManufacturingOrderRevision_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingPayment" ADD CONSTRAINT "ManufacturingPayment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingConversation" ADD CONSTRAINT "ManufacturingConversation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingMessage" ADD CONSTRAINT "ManufacturingMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "ManufacturingConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingMessage" ADD CONSTRAINT "ManufacturingMessage_senderAccountId_fkey"
  FOREIGN KEY ("senderAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingDispute" ADD CONSTRAINT "ManufacturingDispute_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingPayout" ADD CONSTRAINT "ManufacturingPayout_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManufacturingOrderEvent" ADD CONSTRAINT "ManufacturingOrderEvent_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "ManufacturingOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
