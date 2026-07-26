import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateManufacturerCode() {
  const bytes = randomBytes(20);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function hashManufacturerCode(code: string, email: string, explicitPepper?: string) {
  const pepper = explicitPepper ?? process.env.MANUFACTURER_INVITE_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pepper || pepper.length < 32) {
    throw new Error("Configura MANUFACTURER_INVITE_PEPPER con al menos 32 caracteres.");
  }
  return createHash("sha256")
    .update(`${pepper}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function safeCodeMatch(candidateHash: string, expectedHash: string) {
  const candidate = Buffer.from(candidateHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

