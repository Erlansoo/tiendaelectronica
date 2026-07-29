"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { declareManufacturingDelivery } from "@/app/actions/manufacturing";
import { ManufacturingConversation, type ConversationMessage } from "@/components/ManufacturingConversation";

export function ProviderManufacturingOrderPanel({ orderId, status, paymentStatus, payoutStatus, commissionPercent, payoutBob, messages }: { orderId: string; status: string; paymentStatus: string | null; payoutStatus: string | null; commissionPercent: string; payoutBob: string; messages: ConversationMessage[] }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [showDelivery, setShowDelivery] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function declareDelivery() {
    startTransition(async () => {
      const result = await declareManufacturingDelivery(orderId, notes);
      setMessage(result.ok ? result.message ?? "Guardado." : result.error);
      if (result.ok) router.refresh();
    });
  }
  return <section className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm">
    <p>Orden: <strong>{status}</strong>{paymentStatus ? ` · Pago ${paymentStatus}` : ""}{payoutStatus ? ` · Desembolso ${payoutStatus}` : ""}</p><p className="mt-1 text-xs text-indigo-900">Comisión Nubel: {commissionPercent}% · Neto estimado: Bs {payoutBob}</p>
    {status === "AWAITING_PAYMENT" ? <p className="mt-2 text-xs text-indigo-900">El cliente aceptó los términos. Espera la confirmación de pago de Nubel antes de fabricar.</p> : null}
    {status === "IN_PRODUCTION" ? <div className="mt-3"><button className="rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white" type="button" onClick={() => setShowDelivery((value) => !value)}>Declarar entrega</button>{showDelivery ? <div className="mt-3 grid gap-2 rounded border bg-white p-3"><label className="text-xs font-semibold">Detalle de entrega o retiro<textarea className="mt-1 min-h-20 w-full rounded border p-2 font-normal" minLength={10} maxLength={1200} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Fecha, modalidad, referencia o número de guía." /></label><button className="rounded bg-indigo-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || notes.trim().length < 10} type="button" onClick={declareDelivery}>{pending ? "Guardando…" : "Confirmar entrega"}</button></div> : null}</div> : null}
    {status === "DELIVERED" ? <p className="mt-2 text-xs text-indigo-900">Esperando la confirmación del cliente. Si no responde en cuatro días, Nubel retendrá el desembolso para revisar el caso.</p> : null}
    {status === "RECEIVED" ? <p className="mt-2 text-xs text-indigo-900">El cliente confirmó la recepción. Nubel debe aprobar el desembolso manualmente.</p> : null}
    {message ? <p className="mt-2 text-xs text-slate-700">{message}</p> : null}
    <ManufacturingConversation orderId={orderId} messages={messages} />
  </section>;
}
