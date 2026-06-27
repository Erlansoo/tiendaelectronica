"use server";

import { PaymentStatus, SaleStatus, StockMovementReason, StockMovementType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { saleSchema } from "@/lib/validators";

function makeSaleNumber() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `SALE-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createSale(formData: FormData) {
  const rawItems = String(formData.get("items") ?? "[]");
  const parsed = saleSchema.parse({
    items: JSON.parse(rawItems),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerCity: formData.get("customerCity"),
    notes: formData.get("notes"),
    paymentMethod: formData.get("paymentMethod"),
    saleStatus: formData.get("saleStatus"),
  });

  await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: parsed.items.map((item) => item.productId) } },
    });

    const productById = new Map(products.map((product) => [product.id, product]));

    const saleItems = parsed.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) throw new Error("Product not found.");
      if (parsed.saleStatus === SaleStatus.COMPLETED && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}.`);
      }

      const unitPrice = new Prisma.Decimal(product.priceSale);
      const subtotal = unitPrice.mul(item.quantity);

      return {
        product,
        quantity: item.quantity,
        unitPrice,
        subtotal,
      };
    });

    const total = saleItems.reduce((sum, item) => sum.plus(item.subtotal), new Prisma.Decimal(0));
    const sale = await tx.sale.create({
      data: {
        saleNumber: makeSaleNumber(),
        customerName: parsed.customerName,
        customerPhone: parsed.customerPhone,
        customerCity: parsed.customerCity,
        paymentMethod: parsed.paymentMethod,
        paymentStatus: parsed.saleStatus === SaleStatus.COMPLETED ? PaymentStatus.PAID : PaymentStatus.PENDING,
        saleStatus: parsed.saleStatus,
        total,
        notes: parsed.notes,
        items: {
          create: saleItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    });

    if (parsed.saleStatus === SaleStatus.COMPLETED) {
      for (const item of saleItems) {
        const previousStock = item.product.stock;
        const newStock = previousStock - item.quantity;

        await tx.product.update({
          where: { id: item.product.id },
          data: { stock: newStock },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.product.id,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            previousStock,
            newStock,
            reason: StockMovementReason.SALE_OUT,
            referenceType: "Sale",
            referenceId: sale.id,
            notes: `Sale ${sale.saleNumber}`,
          },
        });
      }
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/ventas");
  revalidatePath("/dashboard/inventario");
  revalidatePath("/dashboard/stock-movements");
  revalidatePath("/productos");
  redirect("/dashboard/ventas");
}
