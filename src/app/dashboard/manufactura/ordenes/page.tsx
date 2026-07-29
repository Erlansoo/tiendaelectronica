import { AdminManufacturingOrderActions } from "@/components/AdminManufacturingOrderActions";
import { AdminManufacturingDisputeReview } from "@/components/AdminManufacturingDisputeReview";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManufacturingOrdersAdminPage() {
  await requireStoreAdmin();
  const orders = await prisma.manufacturingOrder.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: {
      offer: { include: { quote: { include: { customer: { select: { name: true, email: true } } } }, manufacturer: true } },
      payment: true,
      payout: true,
      dispute: true,
      events: { orderBy: { createdAt: "desc" }, take: 4 },
    },
  });
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Manufactura 3D</p><h1 className="mt-1 text-3xl font-semibold">Órdenes, pagos y desembolsos</h1></div><p className="text-sm text-slate-500">{orders.length} órdenes recientes</p></div>
    <div className="mt-6 grid gap-4">{orders.map((order) => <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm" key={order.id}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{order.offer.manufacturer.commercialName} · Bs {order.agreedTotalBob.toString()}</h2><p className="mt-1 text-sm text-slate-600">Cliente: {order.offer.quote.customer.name} ({order.offer.quote.customer.email})</p><p className="text-sm text-slate-600">{order.offer.quote.technology} · {order.offer.quote.materialName} · {order.agreedLeadTimeDays} días · comisión {order.commissionPercent.toString()}% · neto Bs {order.payoutBob.toString()}</p></div><div className="text-right text-sm"><p><strong>{order.status}</strong></p><p className="text-slate-500">Pago: {order.payment?.status ?? "—"}</p><p className="text-slate-500">Desembolso: {order.payout?.status ?? "—"}</p></div></div>
      {order.dispute ? <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-sm"><strong>Disputa {order.dispute.status}</strong><p className="mt-1 whitespace-pre-wrap">{order.dispute.reason}</p>{order.dispute.adminNotes ? <p className="mt-2 text-xs">Notas Nubel: {order.dispute.adminNotes}</p> : null}</div> : null}
      {order.dispute && order.dispute.status !== "RESOLVED" ? <AdminManufacturingDisputeReview orderId={order.id} /> : null}
      <AdminManufacturingOrderActions orderId={order.id} paymentPending={order.payment?.status === "PENDING" && order.status === "AWAITING_PAYMENT"} payoutReady={order.payout?.status === "READY_FOR_REVIEW" && order.status === "RECEIVED"} />
      <details className="mt-4 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Últimos eventos</summary><ul className="mt-2 space-y-1">{order.events.map((event) => <li key={event.id}>{event.createdAt.toLocaleString("es-BO")} · {event.type}</li>)}</ul></details>
    </article>)}{orders.length === 0 ? <p className="rounded border border-dashed p-8 text-center text-slate-500">Aún no existen órdenes de manufactura.</p> : null}</div>
  </div>;
}
