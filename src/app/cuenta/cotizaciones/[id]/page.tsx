import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { AcceptRevisedOfferButton, SelectManufacturingOfferButton } from "@/components/SelectManufacturingOfferButton";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  const { id } = await params;
  if (!customer) redirect(`/login?next=/cuenta/cotizaciones/${encodeURIComponent(id)}`);
  const quote = await prisma.manufacturingQuote.findFirst({
    where: { id, customerId: customer.id },
    include: {
      models: true,
      offers: {
        orderBy: { totalBob: "asc" },
        include: {
          manufacturer: true,
          machine: { include: { catalog: true } },
          materialVariant: { include: { material: true } },
          order: true,
        },
      },
    },
  });
  if (!quote) notFound();
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <Link className="text-sm font-semibold text-[#17645e]" href="/cuenta">← Mi cuenta</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-[#17645e]">Cotización 3D</p><h1 className="mt-1 text-3xl font-semibold">{quote.models.length} modelo(s) · {quote.materialName}</h1><p className="mt-2 text-sm text-slate-600">{quote.technology} · {quote.quality} · {quote.destinationCity} · estado {quote.status}</p></div>
          <p className="text-sm text-slate-500">Válida hasta {quote.expiresAt.toLocaleString("es-BO")}</p>
        </div>
        {quote.offers.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {quote.offers.map((offer) => {
              const machineName = offer.machine.catalog ? `${offer.machine.catalog.brand} ${offer.machine.catalog.model}` : `${offer.machine.customBrand} ${offer.machine.customModel}`;
              return <article className={`rounded-md border bg-white p-5 shadow-sm ${offer.status === "SELECTED" || offer.status === "CONFIRMED" || offer.status === "ACCEPTED" ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200"}`} key={offer.id}>
                <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{offer.manufacturer.commercialName}</h2><p className="text-sm text-slate-500">{offer.manufacturer.city}, {offer.manufacturer.department}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{offer.status}</span></div>
                <p className="mt-5 text-3xl font-black">Bs {offer.totalBob.toString()}</p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <Row label="Material" value={`${offer.materialVariant.material.name} · ${offer.materialVariant.colorName}`} />
                  <Row label="Calidad" value={quote.quality} />
                  <Row label="Máquina" value={machineName} />
                  <Row label="Entrega" value={quote.deliveryMode === "LOCAL_PICKUP" ? "Retiro local" : "Envío nacional"} />
                  <Row label="Plazo" value={`${offer.leadTimeDays} días`} />
                </dl>
                {quote.status === "OPEN" && offer.status === "ESTIMATED" ? <div className="mt-5"><SelectManufacturingOfferButton offerId={offer.id} /></div> : null}
                {offer.status === "REVISED" ? <div className="mt-5"><AcceptRevisedOfferButton offerId={offer.id} /></div> : null}
                {offer.revisionReason ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><strong>Cambio propuesto:</strong> {offer.revisionReason}</p> : null}
              </article>;
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="text-lg font-semibold">Aún no hay una combinación compatible</h2><p className="mt-2 text-sm text-slate-600">La solicitud quedó guardada. Aparecerán ofertas cuando exista stock, máquina, tecnología, color y cobertura compatibles.</p></div>
        )}
      </main>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-slate-500">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>;
}
