"use server";

import { StockMovementReason, StockMovementType } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { stockAdjustmentSchema } from "@/lib/validators";

function movementType(previousStock: number, newStock: number) {
  if (newStock > previousStock) return StockMovementType.IN;
  if (newStock < previousStock) return StockMovementType.OUT;
  return StockMovementType.ADJUSTMENT;
}

export async function adjustStock(formData: FormData) {
  await requireStoreAdmin();
  const parsed = stockAdjustmentSchema.parse({
    productId: formData.get("productId"),
    newStock: formData.get("newStock"),
    reason: formData.get("reason") || StockMovementReason.MANUAL_ADJUSTMENT,
    notes: formData.get("notes"),
  });

  await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: parsed.productId },
    });

    await tx.product.update({
      where: { id: product.id },
      data: { stock: parsed.newStock },
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        type: movementType(product.stock, parsed.newStock),
        quantity: Math.abs(parsed.newStock - product.stock),
        previousStock: product.stock,
        newStock: parsed.newStock,
        reason: parsed.reason,
        referenceType: "ManualAdjustment",
        notes: parsed.notes,
      },
    });
  });

  updateTag("products");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/stock-movements");
  revalidatePath("/productos");
  redirect("/dashboard/inventario");
}
