import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MANUFACTURER_ACCESS_COOKIE = "nbl_manufacturer_access";

function getManufacturerPepper(explicitPepper?: string) {
  const pepper = explicitPepper ?? process.env.MANUFACTURER_INVITE_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!pepper || pepper.length < 32) {
    throw new Error("Configura MANUFACTURER_INVITE_PEPPER con al menos 32 caracteres.");
  }
  return pepper;
}

export function generateManufacturerCode() {
  const bytes = randomBytes(20);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

export function hashManufacturerCode(code: string, email: string, explicitPepper?: string) {
  const pepper = getManufacturerPepper(explicitPepper);
  return createHash("sha256")
    .update(`${pepper}:${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

export function safeCodeMatch(candidateHash: string, expectedHash: string) {
  const candidate = Buffer.from(candidateHash, "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createManufacturerAccessToken(accountId: string, capabilityId: string, explicitPepper?: string) {
  const payload = `${accountId}.${capabilityId}.${randomBytes(24).toString("base64url")}`;
  const signature = createHmac("sha256", getManufacturerPepper(explicitPepper))
    .update(`manufacturer-access:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function isManufacturerAccessTokenValid(
  token: string | undefined,
  accountId: string,
  capabilityId: string,
  explicitPepper?: string,
) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== accountId || parts[1] !== capabilityId) return false;
  const payload = parts.slice(0, 3).join(".");
  const expectedSignature = createHmac("sha256", getManufacturerPepper(explicitPepper))
    .update(`manufacturer-access:${payload}`)
    .digest("base64url");
  const supplied = Buffer.from(parts[3], "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
