import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { AcceptRevisedOfferButton, SelectManufacturingOfferButton } from "@/components/SelectManufacturingOfferButton";
import { CustomerManufacturingOrderPanel } from "@/components/CustomerManufacturingOrderPanel";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CustomerQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const customer = await getCurrentCustomer();
  const { id } = await params;
  const sortValue = (await searchParams).sort;
  const sort = sortValue === "response" ? "response" : "price";
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
          order: {
            include: {
              payment: true,
              payout: true,
              dispute: true,
              conversation: { include: { messages: { include: { sender: { select: { name: true } } }, orderBy: { createdAt: "asc" }, take: 100 } } },
            },
          },
        },
      },
    },
  });
  if (!quote) notFound();
  const offers = [...quote.offers].sort((a, b) => {
    if (sort === "response") {
      const responseDifference = (a.estimatedResponseMinutes ?? Number.MAX_SAFE_INTEGER) - (b.estimatedResponseMinutes ?? Number.MAX_SAFE_INTEGER);
      if (responseDifference !== 0) return responseDifference;
    }
    return Number(a.totalBob) - Number(b.totalBob);
  });
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <Link className="text-sm font-semibold text-[#17645e]" href="/cuenta">← Mi cuenta</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-semibold uppercase tracking-wide text-[#17645e]">Cotización 3D</p><h1 className="mt-1 text-3xl font-semibold">{quote.models.length} modelo(s) · {quote.materialName}</h1><p className="mt-2 text-sm text-slate-600">{quote.technology} · {quote.quality} · {quote.destinationCity} · estado {quote.status}</p></div>
          <p className="text-sm text-slate-500">Válida hasta {quote.expiresAt.toLocaleString("es-BO")}</p>
        </div>
        {offers.length ? (
          <>
            <nav aria-label="Orden de las ofertas" className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <span className="mr-1 font-semibold text-slate-700">Ordenar por:</span>
              <Link className={`rounded-full border px-3 py-1.5 font-semibold ${sort === "price" ? "border-[#17645e] bg-[#17645e] text-white" : "border-slate-300 bg-white text-slate-700"}`} href={`/cuenta/cotizaciones/${encodeURIComponent(id)}`}>Mejor precio</Link>
              <Link className={`rounded-full border px-3 py-1.5 font-semibold ${sort === "response" ? "border-[#17645e] bg-[#17645e] text-white" : "border-slate-300 bg-white text-slate-700"}`} href={`/cuenta/cotizaciones/${encodeURIComponent(id)}?sort=response`}>Más rápidos</Link>
            </nav>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer) => {
              const machineName = offer.machine.catalog ? `${offer.machine.catalog.brand} ${offer.machine.catalog.model}` : `${offer.machine.customBrand} ${offer.machine.customModel}`;
              const showPrivateContact = quote.selectedOfferId === offer.id;
              return <article className={`rounded-md border bg-white p-5 shadow-sm ${offer.status === "SELECTED" || offer.status === "CONFIRMED" || offer.status === "ACCEPTED" ? "border-emerald-500 ring-1 ring-emerald-500" : "border-slate-200"}`} key={offer.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {offer.manufacturer.logoUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img className="h-12 w-12 shrink-0 rounded-md border bg-white object-contain" src={offer.manufacturer.logoUrl} alt={`Logo de ${offer.manufacturer.commercialName}`} />
                      : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-900 text-lg font-bold text-white">{offer.manufacturer.commercialName.slice(0, 1).toUpperCase()}</div>}
                    <div className="min-w-0"><h2 className="truncate text-lg font-semibold">{offer.manufacturer.commercialName}</h2><p className="text-sm text-slate-500">{offer.manufacturer.city}, {offer.manufacturer.department}</p></div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{offer.status}</span>
                </div>
                <p className="mt-5 text-3xl font-black">Bs {offer.totalBob.toString()}</p>
                <dl className="mt-4 grid gap-2 text-sm">
                  <Row label="Material" value={`${offer.materialVariant.material.name} · ${offer.materialVariant.colorName}`} />
                  <Row label="Calidad" value={quote.quality} />
                  <Row label="Máquina" value={machineName} />
                  <Row label="Entrega" value={quote.deliveryMode === "LOCAL_PICKUP" ? "Retiro local" : "Envío nacional"} />
                  <Row label="Plazo" value={`${offer.leadTimeDays} días`} />
                  <Row label="Respuesta habitual" value={formatResponseTime(offer.estimatedResponseMinutes)} />
                </dl>
                {showPrivateContact ? (
                  <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
                    <p className="font-semibold">Datos de contacto y retiro</p>
                    <div className="mt-2 grid gap-1">
                      <a className="font-medium underline" href={`https://wa.me/${offer.manufacturer.whatsapp.replace(/\D/g, "")}`} rel="noreferrer" target="_blank">WhatsApp: {offer.manufacturer.whatsapp}</a>
                      {offer.manufacturer.contactEmail ? <a className="font-medium underline" href={`mailto:${offer.manufacturer.contactEmail}`}>Correo: {offer.manufacturer.contactEmail}</a> : null}
                      {quote.deliveryMode === "LOCAL_PICKUP" && offer.manufacturer.localPickupAddress ? <p>Retiro: {offer.manufacturer.localPickupAddress}</p> : null}
                      {quote.deliveryMode === "LOCAL_PICKUP" && offer.manufacturer.localPickupMapUrl ? <a className="font-medium underline" href={offer.manufacturer.localPickupMapUrl} rel="noreferrer" target="_blank">Abrir ubicación en el mapa</a> : null}
                    </div>
                  </div>
                ) : null}
                {quote.status === "OPEN" && offer.status === "ESTIMATED" ? <div className="mt-5"><SelectManufacturingOfferButton offerId={offer.id} /></div> : null}
                {(offer.status === "REVISED" || offer.status === "CONFIRMED") ? <div className="mt-5"><AcceptRevisedOfferButton offerId={offer.id} revised={offer.status === "REVISED"} /></div> : null}
                {offer.revisionReason ? <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><strong>Cambio propuesto:</strong> {offer.revisionReason}</p> : null}
                {offer.order ? <CustomerManufacturingOrderPanel
                  orderId={offer.order.id}
                  status={offer.order.status}
                  agreedTotalBob={offer.order.agreedTotalBob.toString()}
                  agreedLeadTimeDays={offer.order.agreedLeadTimeDays}
                  recommendedLeadTimeDays={offer.order.recommendedLeadTimeDays}
                  payment={offer.order.payment ? { status: offer.order.payment.status, providerReference: offer.order.payment.providerReference, qrPayload: offer.order.payment.qrPayload, expiresAt: offer.order.payment.expiresAt.toISOString() } : null}
                  payoutStatus={offer.order.payout?.status ?? null}
                  deliveredAt={offer.order.deliveredAt?.toISOString() ?? null}
                  deliveryNotes={offer.order.deliveryNotes}
                  customerResponseDueAt={offer.order.customerResponseDueAt?.toISOString() ?? null}
                  dispute={offer.order.dispute ? { status: offer.order.dispute.status, reason: offer.order.dispute.reason } : null}
                  messages={(offer.order.conversation?.messages ?? []).map((message) => ({ id: message.id, body: message.body, createdAt: message.createdAt.toISOString(), senderName: message.sender.name, mine: message.senderAccountId === customer.id }))}
                /> : null}
              </article>;
            })}
            </div>
          </>
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

function formatResponseTime(minutes: number | null): string {
  if (!minutes) return "Aún sin historial";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 24 * 60) return `~${Math.round(minutes / 60)} h`;
  return `~${Math.round(minutes / (24 * 60))} días`;
}
