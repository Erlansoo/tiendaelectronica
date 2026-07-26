import assert from "node:assert/strict";
import test from "node:test";
import {
  createManufacturerAccessToken,
  generateManufacturerCode,
  hashManufacturerCode,
  isManufacturerAccessTokenValid,
  safeCodeMatch,
} from "../src/lib/manufacturer-invite";

const pepper = "test-pepper-with-at-least-thirty-two-characters";

test("genera códigos exactos de 20 caracteres sin símbolos ambiguos", () => {
  const codes = new Set(Array.from({ length: 100 }, () => generateManufacturerCode()));
  assert.equal(codes.size, 100);
  for (const code of codes) assert.match(code, /^[A-HJ-NP-Z2-9]{20}$/);
});

test("el hash queda ligado al correo Google", () => {
  const code = generateManufacturerCode();
  const ownerHash = hashManufacturerCode(code, "owner@gmail.com", pepper);
  const otherHash = hashManufacturerCode(code, "other@gmail.com", pepper);
  assert.notEqual(ownerHash, otherHash);
  assert.equal(safeCodeMatch(hashManufacturerCode(code, "OWNER@gmail.com", pepper), ownerHash), true);
  assert.equal(safeCodeMatch(otherHash, ownerHash), false);
});

test("el acceso manufacturero queda firmado y ligado a una cuenta y capacidad", () => {
  const token = createManufacturerAccessToken("account-1", "capability-1", pepper);
  assert.equal(isManufacturerAccessTokenValid(token, "account-1", "capability-1", pepper), true);
  assert.equal(isManufacturerAccessTokenValid(token, "account-2", "capability-1", pepper), false);
  assert.equal(isManufacturerAccessTokenValid(`${token}x`, "account-1", "capability-1", pepper), false);
});
