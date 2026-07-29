import { InventoryMovementType, ManufacturingOrderEventType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const now = new Date();
  const reservations = await prisma.inventoryReservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lte: now } },
    include: { variant: true, offer: true },
    take: 200,
  });
  let released = 0;
  for (const reservation of reservations) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryReservation.updateMany({
        where: { id: reservation.id, status: "ACTIVE" },
        data: { status: "EXPIRED", releasedAt: now },
      });
      if (claimed.count !== 1) return;
      const rows = await tx.$queryRaw<Array<{ reservedQuantity: Prisma.Decimal }>>(Prisma.sql`
        UPDATE "ManufacturerMaterialVariant"
        SET "reservedQuantity" = GREATEST(0, "reservedQuantity" - ${reservation.quantity}),
            "updatedAt" = NOW()
        WHERE "id" = ${reservation.variantId}
        RETURNING "reservedQuantity"
      `);
      const newReserved = rows[0]?.reservedQuantity ?? new Prisma.Decimal(0);
      await tx.materialInventoryMovement.create({
        data: {
          variantId: reservation.variantId,
          type: InventoryMovementType.RELEASE,
          quantity: reservation.quantity,
          previousAvailable: reservation.variant.availableQuantity,
          newAvailable: reservation.variant.availableQuantity,
          previousReserved: reservation.variant.reservedQuantity,
          newReserved,
          referenceType: "MANUFACTURING_RESERVATION",
          referenceId: reservation.id,
          notes: "Reserva vencida automáticamente",
        },
      });
      const order = await tx.manufacturingOrder.findFirst({ where: { offerId: reservation.offerId }, include: { payment: true } });
      if (order && ["AWAITING_PROVIDER", "AWAITING_CUSTOMER", "AWAITING_PAYMENT", "AGREED"].includes(order.status)) {
        await tx.manufacturingOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED",
            events: { create: { type: ManufacturingOrderEventType.ORDER_CANCELLED, details: { reason: "Reserva de material vencida" } } },
          },
        });
        if (order.payment?.status === "PENDING") {
          await tx.manufacturingPayment.update({ where: { id: order.payment.id }, data: { status: "EXPIRED" } });
        }
      }
      await tx.manufacturingOffer.updateMany({ where: { id: reservation.offerId, status: { in: ["SELECTED", "REVISED"] } }, data: { status: "EXPIRED" } });
      released += 1;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  const staleQuotes = await prisma.manufacturingQuote.findMany({
    where: {
      OR: [
        { status: "DRAFT", createdAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        { status: { in: ["OPEN", "QUOTING"] }, expiresAt: { lte: now } },
      ],
    },
    include: { models: true },
    take: 100,
  });
  const storage = createSupabaseAdminClient().storage.from("manufacturing-quotes");
  const paths = staleQuotes.flatMap((quote) => quote.models.map((model) => model.storagePath));
  if (paths.length) await storage.remove(paths);
  await prisma.manufacturingQuote.deleteMany({ where: { id: { in: staleQuotes.map((quote) => quote.id) } } });

  const deliveriesAwaitingCustomer = await prisma.manufacturingOrder.findMany({
    where: { status: "DELIVERED", customerResponseDueAt: { lte: now }, dispute: null, payout: { status: "NOT_READY" } },
    include: { payout: true },
    take: 200,
  });
  let heldPayouts = 0;
  for (const order of deliveriesAwaitingCustomer) {
    if (!order.payout) continue;
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.manufacturingPayout.updateMany({
        where: { id: order.payout!.id, status: "NOT_READY" },
        data: { status: "ON_HOLD", holdReason: "El cliente no confirmó ni abrió disputa en cuatro días." },
      });
      if (claimed.count !== 1) return;
      await tx.manufacturingOrderEvent.create({
        data: { orderId: order.id, type: ManufacturingOrderEventType.PAYOUT_HELD, details: { reason: "Sin respuesta del cliente tras cuatro días" } },
      });
      heldPayouts += 1;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  return NextResponse.json({ releasedReservations: released, deletedQuotes: staleQuotes.length, heldPayouts });
}
