import type { ManufacturingTechnology } from "@prisma/client";

export type QuoteEstimateInput = {
  technology: ManufacturingTechnology;
  solidVolumeCm3: number;
  envelopeVolumeCm3: number;
  maxHeightMm: number;
  copies: number;
  infillPercent: number;
  densityGcm3: number;
  wastePercent: number;
  materialCostPerBaseUnitBob: number;
  powerWatts: number;
  purchasePriceBob: number;
  residualValueBob: number;
  usefulLifeHours: number;
  maintenanceBobPerHour: number;
  electricityBobKwh: number;
  laborBobPerHour: number;
  setupMinutes: number;
  postprocessMinutes: number;
  consumablesBob: number;
  failureRiskPercent: number;
  marginPercent: number;
  minimumChargeBob: number;
  throughputCm3PerHour?: number;
  layerHeightMm?: number;
  secondsPerLayer?: number;
  resinSupportPercent?: number;
  hollowPercent?: number;
};

export function calculateManufacturingEstimate(input: QuoteEstimateInput) {
  const copies = Math.max(1, input.copies);
  const wasteMultiplier = 1 + Math.max(0, input.wastePercent) / 100;
  let materialQuantity: number;
  let printHours: number;

  if (input.technology === "FDM") {
    const infill = Math.min(1, Math.max(0, input.infillPercent / 100));
    const effectiveVolumeCm3 = input.solidVolumeCm3 * (0.22 + 0.78 * infill) * copies;
    materialQuantity = effectiveVolumeCm3 * input.densityGcm3 * wasteMultiplier;
    printHours = effectiveVolumeCm3 / Math.max(0.01, input.throughputCm3PerHour ?? 8);
  } else {
    const hollowMultiplier = Math.min(1, Math.max(0.1, 1 - (input.hollowPercent ?? 0) / 100));
    const supportsMultiplier = 1 + Math.max(0, input.resinSupportPercent ?? 12) / 100;
    const effectiveVolumeCm3 = input.solidVolumeCm3 * hollowMultiplier * supportsMultiplier * copies;
    materialQuantity = effectiveVolumeCm3 * wasteMultiplier;
    const layers = Math.ceil(input.maxHeightMm / Math.max(0.01, input.layerHeightMm ?? 0.05));
    printHours = (layers * Math.max(0.1, input.secondsPerLayer ?? 8)) / 3600;
  }

  const material = (materialQuantity / 1000) * input.materialCostPerBaseUnitBob;
  const electricity = (input.powerWatts / 1000) * printHours * input.electricityBobKwh;
  const depreciation = (Math.max(0, input.purchasePriceBob - input.residualValueBob) / Math.max(1, input.usefulLifeHours)) * printHours;
  const maintenance = input.maintenanceBobPerHour * printHours;
  const laborHours = (Math.max(0, input.setupMinutes) + Math.max(0, input.postprocessMinutes)) / 60;
  const labor = laborHours * input.laborBobPerHour;
  const subtotal = material + electricity + depreciation + maintenance + labor + input.consumablesBob;
  const risk = subtotal * Math.max(0, input.failureRiskPercent) / 100;
  const beforeMargin = subtotal + risk;
  const margin = beforeMargin * Math.max(0, input.marginPercent) / 100;
  const total = Math.max(input.minimumChargeBob, beforeMargin + margin);

  return {
    materialQuantity: round(materialQuantity, 3),
    printHours: round(printHours, 3),
    totalBob: round(total, 2),
    breakdown: {
      material: round(material, 2),
      electricity: round(electricity, 2),
      depreciation: round(depreciation, 2),
      maintenance: round(maintenance, 2),
      labor: round(labor, 2),
      consumables: round(input.consumablesBob, 2),
      risk: round(risk, 2),
      margin: round(margin, 2),
    },
  };
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

