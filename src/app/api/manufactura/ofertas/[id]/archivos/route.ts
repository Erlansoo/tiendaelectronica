import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { hasManufacturerAreaAccess } from "@/lib/manufacturing";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const offer = await prisma.manufacturingOffer.findUnique({
    where: { id },
    include: {
      quote: { include: { models: true } },
      manufacturer: { include: { capability: true } },
    },
  });
  if (!offer) return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });
  const isOwner = offer.quote.customerId === customer.id;
  const isSelectedProvider =
    offer.manufacturer.capability.accountId === customer.id &&
    ["ONBOARDING", "ACTIVE"].includes(offer.manufacturer.capability.status) &&
    ["SELECTED", "CONFIRMED", "REVISED", "ACCEPTED"].includes(offer.status);
  const hasUnlockedManufacturerArea = isSelectedProvider
    && await hasManufacturerAreaAccess(customer.id, offer.manufacturer.capability.id);
  if (!isOwner && !hasUnlockedManufacturerArea && !customer.isStoreAdmin) {
    return NextResponse.json({ error: "No tienes acceso a estos archivos" }, { status: 403 });
  }
  const storage = createSupabaseAdminClient().storage.from("manufacturing-quotes");
  const files = await Promise.all(offer.quote.models.map(async (model) => {
    const { data, error } = await storage.createSignedUrl(model.storagePath, 10 * 60, { download: model.originalName });
    if (error || !data) return null;
    return { name: model.originalName, url: data.signedUrl, expiresInSeconds: 600 };
  }));
  return NextResponse.json(
    { files: files.filter(Boolean) },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } },
  );
}
