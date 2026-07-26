-- CreateEnum
CREATE TYPE "CapabilityType" AS ENUM ('MANUFACTURER', 'SELLER');

-- CreateEnum
CREATE TYPE "CapabilityStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ManufacturerApplicationStatus" AS ENUM ('DRAFT', 'PENDING', 'NEEDS_INFO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ManufacturerInviteStatus" AS ENUM ('ACTIVE', 'USED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ManufacturingTechnology" AS ENUM ('FDM', 'RESIN');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('LOCAL_PICKUP', 'NATIONAL_SHIPPING');

-- CreateEnum
CREATE TYPE "MachineReviewStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('GRAM', 'MILLILITER');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'RESERVE', 'RELEASE', 'CONSUME');

-- CreateEnum
CREATE TYPE "ManufacturingQuality" AS ENUM ('FAST', 'BALANCED', 'DETAIL');

-- CreateEnum
CREATE TYPE "ManufacturingQuoteStatus" AS ENUM ('DRAFT', 'QUOTING', 'OPEN', 'SELECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ManufacturingOfferStatus" AS ENUM ('ESTIMATED', 'SELECTED', 'CONFIRMED', 'REVISED', 'ACCEPTED', 'EXPIRED', 'DECLINED');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ManufacturingOrderStatus" AS ENUM ('AWAITING_PROVIDER', 'AWAITING_CUSTOMER', 'AGREED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "AccountCapability" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "CapabilityType" NOT NULL,
    "status" "CapabilityStatus" NOT NULL DEFAULT 'ONBOARDING',
    "activatedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerApplication" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ManufacturerApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "commercialName" TEXT NOT NULL,
    "responsibleName" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "technologies" "ManufacturingTechnology"[],
    "declaredMachines" TEXT NOT NULL,
    "deliveryModes" "DeliveryMode"[],
    "workLinks" TEXT[],
    "applicantNotes" TEXT,
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerEvidence" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManufacturerEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerInvite" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "ManufacturerInviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManufacturerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerProfile" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "department" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "deliveryModes" "DeliveryMode"[],
    "usualLeadTimeDays" INTEGER NOT NULL DEFAULT 3,
    "responsibilityAcceptedAt" TIMESTAMP(3),
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterCatalog" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "technology" "ManufacturingTechnology" NOT NULL,
    "buildWidthMm" DECIMAL(10,3) NOT NULL,
    "buildDepthMm" DECIMAL(10,3) NOT NULL,
    "buildHeightMm" DECIMAL(10,3) NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerMachine" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "catalogId" TEXT,
    "customBrand" TEXT,
    "customModel" TEXT,
    "technology" "ManufacturingTechnology" NOT NULL,
    "buildWidthMm" DECIMAL(10,3) NOT NULL,
    "buildDepthMm" DECIMAL(10,3) NOT NULL,
    "buildHeightMm" DECIMAL(10,3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "reviewStatus" "MachineReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "purchasePriceBob" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "residualValueBob" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "usefulLifeHours" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "powerWatts" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maintenanceBobPerHour" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MachineQualityProfile" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "quality" "ManufacturingQuality" NOT NULL,
    "layerHeightMm" DECIMAL(6,3) NOT NULL,
    "throughputCm3PerHour" DECIMAL(10,3),
    "secondsPerLayer" DECIMAL(10,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MachineQualityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCatalog" (
    "id" TEXT NOT NULL,
    "technology" "ManufacturingTechnology" NOT NULL,
    "name" TEXT NOT NULL,
    "defaultDensityGcm3" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerMaterialVariant" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT,
    "unit" "InventoryUnit" NOT NULL,
    "costPerBaseUnitBob" DECIMAL(12,2) NOT NULL,
    "densityGcm3" DECIMAL(8,4),
    "wastePercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "availableQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerMaterialVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialInventoryMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "previousAvailable" DECIMAL(14,3) NOT NULL,
    "newAvailable" DECIMAL(14,3) NOT NULL,
    "previousReserved" DECIMAL(14,3) NOT NULL,
    "newReserved" DECIMAL(14,3) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialInventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturerPricingProfile" (
    "id" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "technology" "ManufacturingTechnology" NOT NULL,
    "electricityBobKwh" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "laborBobPerHour" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "setupMinutes" INTEGER NOT NULL DEFAULT 0,
    "postprocessMinutes" INTEGER NOT NULL DEFAULT 0,
    "consumablesBob" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "failureRiskPercent" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "marginPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "minimumChargeBob" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "platformCommissionPercent" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturerPricingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturingQuote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "technology" "ManufacturingTechnology" NOT NULL,
    "materialName" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "quality" "ManufacturingQuality" NOT NULL,
    "infillPercent" DECIMAL(5,2),
    "copies" INTEGER NOT NULL DEFAULT 1,
    "workspaceWidthMm" DECIMAL(10,3) NOT NULL,
    "workspaceDepthMm" DECIMAL(10,3) NOT NULL,
    "workspaceHeightMm" DECIMAL(10,3) NOT NULL,
    "deliveryMode" "DeliveryMode" NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "status" "ManufacturingQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "selectedOfferId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturingQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturingQuoteModel" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "position" JSONB NOT NULL,
    "rotation" JSONB NOT NULL,
    "scale" JSONB NOT NULL,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "solidVolumeCm3" DECIMAL(14,4) NOT NULL,
    "envelopeVolumeCm3" DECIMAL(14,4) NOT NULL,
    "widthMm" DECIMAL(10,3) NOT NULL,
    "depthMm" DECIMAL(10,3) NOT NULL,
    "heightMm" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManufacturingQuoteModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturingOffer" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "materialVariantId" TEXT NOT NULL,
    "status" "ManufacturingOfferStatus" NOT NULL DEFAULT 'ESTIMATED',
    "estimatedMaterialQty" DECIMAL(14,3) NOT NULL,
    "estimatedHours" DECIMAL(10,3) NOT NULL,
    "totalBob" DECIMAL(12,2) NOT NULL,
    "costBreakdown" JSONB NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "revisionReason" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "selectedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturingOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManufacturingOrder" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "status" "ManufacturingOrderStatus" NOT NULL DEFAULT 'AWAITING_PROVIDER',
    "agreedTotalBob" DECIMAL(12,2) NOT NULL,
    "agreedLeadTimeDays" INTEGER NOT NULL,
    "revisionReason" TEXT,
    "customerAcceptedAt" TIMESTAMP(3),
    "providerAcceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManufacturingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountCapability_type_status_idx" ON "AccountCapability"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCapability_accountId_type_key" ON "AccountCapability"("accountId", "type");

-- CreateIndex
CREATE INDEX "ManufacturerApplication_status_submittedAt_idx" ON "ManufacturerApplication"("status", "submittedAt");

-- CreateIndex
CREATE INDEX "ManufacturerApplication_accountId_createdAt_idx" ON "ManufacturerApplication"("accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerEvidence_storagePath_key" ON "ManufacturerEvidence"("storagePath");

-- CreateIndex
CREATE INDEX "ManufacturerEvidence_applicationId_idx" ON "ManufacturerEvidence"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerInvite_codeHash_key" ON "ManufacturerInvite"("codeHash");

-- CreateIndex
CREATE INDEX "ManufacturerInvite_accountId_status_idx" ON "ManufacturerInvite"("accountId", "status");

-- CreateIndex
CREATE INDEX "ManufacturerInvite_email_status_idx" ON "ManufacturerInvite"("email", "status");

-- CreateIndex
CREATE INDEX "ManufacturerInvite_expiresAt_idx" ON "ManufacturerInvite"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerProfile_capabilityId_key" ON "ManufacturerProfile"("capabilityId");

-- CreateIndex
CREATE INDEX "ManufacturerProfile_isPublic_city_idx" ON "ManufacturerProfile"("isPublic", "city");

-- CreateIndex
CREATE INDEX "PrinterCatalog_technology_isActive_idx" ON "PrinterCatalog"("technology", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterCatalog_brand_model_technology_key" ON "PrinterCatalog"("brand", "model", "technology");

-- CreateIndex
CREATE INDEX "ManufacturerMachine_manufacturerId_reviewStatus_idx" ON "ManufacturerMachine"("manufacturerId", "reviewStatus");

-- CreateIndex
CREATE INDEX "ManufacturerMachine_technology_reviewStatus_idx" ON "ManufacturerMachine"("technology", "reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MachineQualityProfile_machineId_quality_key" ON "MachineQualityProfile"("machineId", "quality");

-- CreateIndex
CREATE INDEX "MaterialCatalog_technology_isActive_idx" ON "MaterialCatalog"("technology", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCatalog_technology_name_key" ON "MaterialCatalog"("technology", "name");

-- CreateIndex
CREATE INDEX "ManufacturerMaterialVariant_manufacturerId_isActive_idx" ON "ManufacturerMaterialVariant"("manufacturerId", "isActive");

-- CreateIndex
CREATE INDEX "ManufacturerMaterialVariant_materialId_isActive_idx" ON "ManufacturerMaterialVariant"("materialId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerMaterialVariant_manufacturerId_materialId_color_key" ON "ManufacturerMaterialVariant"("manufacturerId", "materialId", "colorName");

-- CreateIndex
CREATE INDEX "MaterialInventoryMovement_variantId_createdAt_idx" ON "MaterialInventoryMovement"("variantId", "createdAt");

-- CreateIndex
CREATE INDEX "MaterialInventoryMovement_referenceType_referenceId_idx" ON "MaterialInventoryMovement"("referenceType", "referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturerPricingProfile_manufacturerId_technology_key" ON "ManufacturerPricingProfile"("manufacturerId", "technology");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturingQuote_selectedOfferId_key" ON "ManufacturingQuote"("selectedOfferId");

-- CreateIndex
CREATE INDEX "ManufacturingQuote_customerId_createdAt_idx" ON "ManufacturingQuote"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "ManufacturingQuote_status_expiresAt_idx" ON "ManufacturingQuote"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturingQuoteModel_storagePath_key" ON "ManufacturingQuoteModel"("storagePath");

-- CreateIndex
CREATE INDEX "ManufacturingQuoteModel_quoteId_idx" ON "ManufacturingQuoteModel"("quoteId");

-- CreateIndex
CREATE INDEX "ManufacturingOffer_manufacturerId_status_idx" ON "ManufacturingOffer"("manufacturerId", "status");

-- CreateIndex
CREATE INDEX "ManufacturingOffer_validUntil_idx" ON "ManufacturingOffer"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturingOffer_quoteId_manufacturerId_key" ON "ManufacturingOffer"("quoteId", "manufacturerId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryReservation_offerId_key" ON "InventoryReservation"("offerId");

-- CreateIndex
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ManufacturingOrder_offerId_key" ON "ManufacturingOrder"("offerId");

-- CreateIndex
CREATE INDEX "ManufacturingOrder_status_createdAt_idx" ON "ManufacturingOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerAccount_email_idx" ON "CustomerAccount"("email");

-- AddForeignKey
ALTER TABLE "AccountCapability" ADD CONSTRAINT "AccountCapability_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerApplication" ADD CONSTRAINT "ManufacturerApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerEvidence" ADD CONSTRAINT "ManufacturerEvidence_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ManufacturerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerInvite" ADD CONSTRAINT "ManufacturerInvite_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ManufacturerApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerInvite" ADD CONSTRAINT "ManufacturerInvite_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerProfile" ADD CONSTRAINT "ManufacturerProfile_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "AccountCapability"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerMachine" ADD CONSTRAINT "ManufacturerMachine_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerMachine" ADD CONSTRAINT "ManufacturerMachine_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "PrinterCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MachineQualityProfile" ADD CONSTRAINT "MachineQualityProfile_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "ManufacturerMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerMaterialVariant" ADD CONSTRAINT "ManufacturerMaterialVariant_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerMaterialVariant" ADD CONSTRAINT "ManufacturerMaterialVariant_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialInventoryMovement" ADD CONSTRAINT "MaterialInventoryMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ManufacturerMaterialVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturerPricingProfile" ADD CONSTRAINT "ManufacturerPricingProfile_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingQuote" ADD CONSTRAINT "ManufacturingQuote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingQuote" ADD CONSTRAINT "ManufacturingQuote_selectedOfferId_fkey" FOREIGN KEY ("selectedOfferId") REFERENCES "ManufacturingOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingQuoteModel" ADD CONSTRAINT "ManufacturingQuoteModel_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ManufacturingQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOffer" ADD CONSTRAINT "ManufacturingOffer_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "ManufacturingQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOffer" ADD CONSTRAINT "ManufacturingOffer_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "ManufacturerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOffer" ADD CONSTRAINT "ManufacturingOffer_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "ManufacturerMachine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOffer" ADD CONSTRAINT "ManufacturingOffer_materialVariantId_fkey" FOREIGN KEY ("materialVariantId") REFERENCES "ManufacturerMaterialVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ManufacturingOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ManufacturerMaterialVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManufacturingOrder" ADD CONSTRAINT "ManufacturingOrder_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "ManufacturingOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
