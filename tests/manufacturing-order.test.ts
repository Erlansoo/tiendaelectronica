import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrderSettlement, MAX_MANUFACTURING_LEAD_DAYS, recommendedLeadTimeDays } from "../src/lib/manufacturing-order";

test("calcula un plazo recomendado con producción, resina y envío", () => {
  assert.equal(recommendedLeadTimeDays({ estimatedHours: 17, technology: "RESIN", deliveryMode: "NATIONAL_SHIPPING" }), 7);
});

test("limita el plazo recomendado al máximo comercial", () => {
  assert.equal(recommendedLeadTimeDays({ estimatedHours: 200, technology: "FDM", deliveryMode: "LOCAL_PICKUP" }), MAX_MANUFACTURING_LEAD_DAYS);
});

test("aplica comisión base y recargo progresivo", () => {
  assert.deepEqual(calculateOrderSettlement(100, 3, 3), { commissionPercent: 8, commissionBob: 8, payoutBob: 92 });
  assert.deepEqual(calculateOrderSettlement(100, 6, 3), { commissionPercent: 9, commissionBob: 9, payoutBob: 91 });
  assert.deepEqual(calculateOrderSettlement(100, 8, 3), { commissionPercent: 10, commissionBob: 10, payoutBob: 90 });
});
