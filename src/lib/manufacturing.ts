import "server-only";

import { CapabilityStatus, CapabilityType, Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export { generateManufacturerCode, hashManufacturerCode, safeCodeMatch } from "@/lib/manufacturer-invite";

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
  return { customer, capability };
}

export function decimal(value: number | string) {
  return new Prisma.Decimal(value);
}
