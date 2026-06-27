"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseJsonObject, parseTags, productSchema } from "@/lib/validators";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function productPayload(formData: FormData) {
  const raw = formDataToObject(formData);
  const parsed = productSchema.parse({
    ...raw,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });

  return {
    ...parsed,
    priceSale: new Prisma.Decimal(parsed.priceSale),
    priceCost: parsed.priceCost === undefined ? undefined : new Prisma.Decimal(parsed.priceCost),
    tags: parseTags(parsed.tags),
    technicalAttributes: parseJsonObject(parsed.technicalAttributes),
  };
}

export async function createProduct(formData: FormData) {
  await prisma.product.create({
    data: productPayload(formData),
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/dashboard/productos");
  redirect("/dashboard/productos");
}

export async function updateProduct(id: string, formData: FormData) {
  await prisma.product.update({
    where: { id },
    data: productPayload(formData),
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/dashboard/productos");
  redirect("/dashboard/productos");
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await prisma.product.update({
    where: { id },
    data: { isActive: !isActive },
  });

  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/dashboard/productos");
}
