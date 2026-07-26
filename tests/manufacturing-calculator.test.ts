import assert from "node:assert/strict";
import test from "node:test";
import { ManufacturingTechnology } from "@prisma/client";
import { calculateManufacturingEstimate, type QuoteEstimateInput } from "../src/lib/manufacturing-calculator";

const base: QuoteEstimateInput = {
  technology: ManufacturingTechnology.FDM,
  solidVolumeCm3: 100,
  envelopeVolumeCm3: 150,
  maxHeightMm: 100,
  copies: 1,
  infillPercent: 20,
  densityGcm3: 1.24,
  wastePercent: 10,
  materialCostPerBaseUnitBob: 150,
  powerWatts: 200,
  purchasePriceBob: 5000,
  residualValueBob: 500,
  usefulLifeHours: 5000,
  maintenanceBobPerHour: 0.5,
  electricityBobKwh: 0.8,
  laborBobPerHour: 20,
  setupMinutes: 15,
  postprocessMinutes: 15,
  consumablesBob: 2,
  failureRiskPercent: 8,
  marginPercent: 25,
  minimumChargeBob: 0,
  throughputCm3PerHour: 8,
};

test("FDM estima gramos mediante volumen, relleno, densidad y desperdicio", () => {
  const estimate = calculateManufacturingEstimate(base);
  assert.equal(estimate.materialQuantity, 51.286);
  assert.equal(estimate.printHours, 4.7);
  assert.ok(estimate.totalBob > 0);
});

test("resina estima mililitros y tiempo por ciclo de capa", () => {
  const estimate = calculateManufacturingEstimate({
    ...base,
    technology: ManufacturingTechnology.RESIN,
    layerHeightMm: 0.05,
    secondsPerLayer: 8,
    resinSupportPercent: 12,
    hollowPercent: 50,
  });
  assert.equal(estimate.materialQuantity, 61.6);
  assert.equal(estimate.printHours, 4.444);
});

test("respeta cobro mínimo y redondea a centavos BOB", () => {
  const estimate = calculateManufacturingEstimate({ ...base, solidVolumeCm3: 1, minimumChargeBob: 100 });
  assert.equal(estimate.totalBob, 100);
  assert.equal(Number(estimate.totalBob.toFixed(2)), estimate.totalBob);
});

