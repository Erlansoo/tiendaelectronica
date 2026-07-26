-- Contact information remains private until a customer selects an offer.
ALTER TABLE "ManufacturerProfile"
  ADD COLUMN "contactEmail" TEXT,
  ADD COLUMN "localPickupAddress" TEXT,
  ADD COLUMN "localPickupMapUrl" TEXT;
