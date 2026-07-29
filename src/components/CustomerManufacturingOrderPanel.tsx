"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmManufacturingReceipt, openManufacturingDispute } from "@/app/actions/manufacturing";
import { ManufacturingConversation, type ConversationMessage } from "@/components/ManufacturingConversation";

type Props = {
  orderId: string;
  status: string;
  agreedTotalBob: string;
  agreedLeadTimeDays: number;
  recommendedLeadTimeDays: number | null;
  payment: null | { status: string; providerReference: string; qrPayload: string; expiresAt: string };
  payoutStatus: string | null;
  deliveredAt: string | null;
  deliveryNotes: string | null;
  customerResponseDueAt: string | null;
  dispute: null | { status: string; reason: string };
  messages: ConversationMessage[];
};

export function CustomerManufacturingOrderPanel(props: Props) {
  const router = useRouter();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const invoke = (action: "RECEIVE" | "DISPUTE") => startTransition(async () => {
    const result = action === "RECEIVE" ? await confirmManufacturingReceipt(props.orderId) : await openManufacturingDispute(props.orderId, reason);
    setMessage(result.ok ? result.message ?? "Guardado." : result.error);
    if (result.ok) router.refresh();
  });
  return <section className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Orden seleccionada</h3><p className="mt-1 text-emerald-950">Estado: <strong>{props.status}</strong> · Precio final Bs {props.agreedTotalBob} · Plazo {props.agreedLeadTimeDays} día(s)</p></div></div>
    {props.recommendedLeadTimeDays ? <p className="mt-2 text-xs text-emerald-900">Plazo recomendado para este trabajo: {props.recommendedLeadTimeDays} día(s).</p> : null}
    {props.payment?.status === "PENDING" ? <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4"><div className="flex flex-wrap items-center gap-4"><div className="grid h-24 w-24 grid-cols-5 gap-1 rounded bg-white p-2 ring-1 ring-slate-300" aria-label="QR de prueba">{Array.from({ length: 25 }, (_, index) => <span className={index % 3 === 0 || index % 7 === 0 ? "bg-slate-950" : "bg-white"} key={index} />)}</div><div><h4 className="font-semibold text-amber-950">QR de prueba — pago aún no real</h4><p className="mt-1 text-xs text-amber-900">Referencia: {props.payment.providerReference}</p><p className="mt-1 text-xs text-amber-900">Vence: {new Date(props.payment.expiresAt).toLocaleString("es-BO")}</p><p className="mt-2 text-xs text-amber-900">Nubel confirmará el pago de prueba. Cuando llegue la API bancaria, este QR será reemplazado por uno bancario verificable.</p></div></div></div> : null}
    {props.deliveredAt ? <div className="mt-4 rounded-md border border-sky-200 bg-sky-50 p-3"><h4 className="font-semibold">Entrega declarada</h4><p className="mt-1 text-xs">{props.deliveryNotes}</p>{props.customerResponseDueAt ? <p className="mt-2 text-xs">Confirma la recepción o abre una disputa hasta {new Date(props.customerResponseDueAt).toLocaleString("es-BO")}. Después Nubel retendrá el desembolso para revisión.</p> : null}</div> : null}
    {props.status === "DELIVERED" && !props.dispute ? <div className="mt-4 flex flex-wrap gap-2"><button className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending} type="button" onClick={() => invoke("RECEIVE")}>Recibido conforme</button><button className="rounded border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-800 disabled:opacity-50" disabled={pending} type="button" onClick={() => setDisputeOpen((value) => !value)}>Abrir disputa</button></div> : null}
    {disputeOpen ? <div className="mt-3 grid gap-2 rounded border border-rose-200 bg-white p-3"><label className="text-xs font-semibold">Explica el problema<textarea className="mt-1 min-h-20 w-full rounded border p-2 font-normal" minLength={15} maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || reason.trim().length < 15} type="button" onClick={() => invoke("DISPUTE")}>Enviar disputa a Nubel</button></div> : null}
    {props.dispute ? <p className="mt-4 rounded bg-rose-100 p-3 text-xs text-rose-900">Disputa {props.dispute.status}: {props.dispute.reason}</p> : null}
    {props.payoutStatus === "ON_HOLD" ? <p className="mt-4 rounded bg-amber-100 p-3 text-xs text-amber-900">El desembolso está retenido para revisión manual de Nubel.</p> : null}
    {message ? <p className="mt-3 text-xs text-slate-700">{message}</p> : null}
    <ManufacturingConversation orderId={props.orderId} messages={props.messages} />
  </section>;
}
