import "server-only";

import { CapabilityStatus, CapabilityType, Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import {
  createManufacturerAccessToken,
  isManufacturerAccessTokenValid,
  MANUFACTURER_ACCESS_COOKIE,
} from "@/lib/manufacturer-invite";
import { prisma } from "@/lib/prisma";

export {
  generateManufacturerCode,
  hashManufacturerCode,
  MANUFACTURER_ACCESS_COOKIE,
  safeCodeMatch,
} from "@/lib/manufacturer-invite";

const manufacturerAccessCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  priority: "high" as const,
};

export async function grantManufacturerAreaAccess(accountId: string, capabilityId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    MANUFACTURER_ACCESS_COOKIE,
    createManufacturerAccessToken(accountId, capabilityId),
    manufacturerAccessCookieOptions,
  );
}

export async function hasManufacturerAreaAccess(accountId: string, capabilityId: string) {
  const cookieStore = await cookies();
  return isManufacturerAccessTokenValid(
    cookieStore.get(MANUFACTURER_ACCESS_COOKIE)?.value,
    accountId,
    capabilityId,
  );
}

export async function requireManufacturerCapability(allowed: CapabilityStatus[] = ["ONBOARDING", "ACTIVE"]) {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login?next=/cuenta/manufactura");

  const capability = await prisma.accountCapability.findUnique({
    where: {
      accountId_type: {
        accountId: customer.id,
        type: CapabilityType.MANUFACTURER,
      },
    },
    include: { profile: true },
  });

  if (!capability || !allowed.includes(capability.status)) redirect("/cuenta");
  if (!await hasManufacturerAreaAccess(customer.id, capability.id)) redirect("/cuenta?manufacturing=locked");
  return { customer, capability };
}

export function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}
