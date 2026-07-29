import type { DeliveryMode, ManufacturingTechnology } from "@prisma/client";

export const MAX_MANUFACTURING_LEAD_DAYS = 10;
export const BASE_PLATFORM_COMMISSION_PERCENT = 8;

export function recommendedLeadTimeDays(input: {
  estimatedHours: number;
  technology: ManufacturingTechnology;
  deliveryMode: DeliveryMode;
}) {
  const productionDays = Math.ceil(Math.max(0, input.estimatedHours) / 8);
  const setupDays = 1;
  const resinPostprocessDays = input.technology === "RESIN" ? 1 : 0;
  const shippingDays = input.deliveryMode === "NATIONAL_SHIPPING" ? 2 : 0;
  return Math.min(MAX_MANUFACTURING_LEAD_DAYS, Math.max(1, productionDays + setupDays + resinPostprocessDays + shippingDays));
}

export function platformCommissionPercent(leadTimeDays: number, recommendedDays: number) {
  const excessDays = Math.max(0, leadTimeDays - recommendedDays);
  if (excessDays === 0) return BASE_PLATFORM_COMMISSION_PERCENT;
  if (excessDays <= 3) return BASE_PLATFORM_COMMISSION_PERCENT + 1;
  if (excessDays <= 7) return BASE_PLATFORM_COMMISSION_PERCENT + 2;
  return BASE_PLATFORM_COMMISSION_PERCENT + 4;
}

export function calculateOrderSettlement(totalBob: number, leadTimeDays: number, recommendedDays: number) {
  const commissionPercent = platformCommissionPercent(leadTimeDays, recommendedDays);
  const commissionBob = roundMoney(totalBob * commissionPercent / 100);
  return {
    commissionPercent,
    commissionBob,
    payoutBob: roundMoney(Math.max(0, totalBob - commissionBob)),
  };
}

export function buildMockPaymentPayload(orderId: string, amountBob: number, reference: string) {
  return `NUBEL-STORE|TEST|${reference}|${orderId}|BOB|${amountBob.toFixed(2)}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
