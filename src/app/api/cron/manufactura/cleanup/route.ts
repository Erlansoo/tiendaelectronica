import { InventoryMovementType, Prisma } from "@prisma/client";
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
      await tx.manufacturingOrder.updateMany({ where: { offerId: reservation.offerId, status: { in: ["AWAITING_PROVIDER", "AWAITING_CUSTOMER"] } }, data: { status: "CANCELLED" } });
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

  return NextResponse.json({ releasedReservations: released, deletedQuotes: staleQuotes.length });
}

