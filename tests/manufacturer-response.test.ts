import assert from "node:assert/strict";
import test from "node:test";
import { getResponseMinutes, getTypicalResponseMinutes } from "../src/lib/manufacturer-response";

const at = (minutes: number) => new Date(1_700_000_000_000 + minutes * 60_000);

test("calcula el primer tiempo de respuesta en minutos", () => {
  assert.equal(getResponseMinutes({ selectedAt: at(0), firstRespondedAt: at(47) }), 47);
});

test("descarta respuestas imposibles o abandonadas de mas de siete dias", () => {
  assert.equal(getResponseMinutes({ selectedAt: at(20), firstRespondedAt: at(10) }), null);
  assert.equal(getResponseMinutes({ selectedAt: at(0), firstRespondedAt: at(7 * 24 * 60 + 1) }), null);
});

test("usa la mediana para que una respuesta tardia no distorsione el tiempo habitual", () => {
  const samples = [30, 45, 60, 120, 7 * 24 * 60 + 1].map((minutes) => ({ selectedAt: at(0), firstRespondedAt: at(minutes) }));
  assert.equal(getTypicalResponseMinutes(samples), 53);
});
