-- Track the first provider reply after a customer selects an offer. The
-- customer-facing estimate is a snapshot of the provider's prior median.
ALTER TABLE "ManufacturingOffer"
  ADD COLUMN "firstRespondedAt" TIMESTAMP(3),
  ADD COLUMN "estimatedResponseMinutes" INTEGER;

CREATE INDEX "ManufacturingOffer_manufacturerId_selectedAt_idx"
  ON "ManufacturingOffer"("manufacturerId", "selectedAt");
