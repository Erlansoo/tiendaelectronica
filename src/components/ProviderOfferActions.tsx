"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { respondToSelectedOffer } from "@/app/actions/manufacturing";

export function ProviderOfferActions({ offerId, currentTotal, currentLeadTime }: { offerId: string; currentTotal: string; currentLeadTime: number }) {
  const router = useRouter();
  const [showRevision, setShowRevision] = useState(false);
  const [total, setTotal] = useState(currentTotal);
  const [leadTime, setLeadTime] = useState(String(currentLeadTime));
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function respond(response: "CONFIRM" | "REVISE") {
    startTransition(async () => {
      const result = await respondToSelectedOffer(offerId, response, Number(total), Number(leadTime), reason);
      setMessage(result.ok ? result.message ?? "Guardado." : result.error);
      if (result.ok) router.refresh();
    });
  }
  return <div className="mt-3">
    {message ? <p className="mb-2 rounded bg-slate-100 p-2 text-xs">{message}</p> : null}
    <div className="flex flex-wrap gap-2">
      <button className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white" disabled={pending} type="button" onClick={() => respond("CONFIRM")}>Confirmar precio y plazo</button>
      <button className="rounded border px-3 py-2 text-xs font-semibold" disabled={pending} type="button" onClick={() => setShowRevision((value) => !value)}>Proponer cambio</button>
      <a className="rounded border px-3 py-2 text-xs font-semibold text-blue-700" href={`/api/manufactura/ofertas/${offerId}/archivos`} target="_blank">Acceder a archivos</a>
    </div>
    {showRevision ? <div className="mt-3 grid gap-2 rounded border bg-amber-50 p-3 sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-semibold">Nuevo total Bs<input className="h-9 rounded border px-2" type="number" min="0.01" step="0.01" value={total} onChange={(event) => setTotal(event.target.value)} /></label>
      <label className="grid gap-1 text-xs font-semibold">Nuevo plazo (días, máximo 10)<input className="h-9 rounded border px-2" type="number" min="1" max="10" value={leadTime} onChange={(event) => setLeadTime(event.target.value)} /></label>
      <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Motivo<textarea className="min-h-16 rounded border p-2" minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      <button className="rounded bg-amber-700 px-3 py-2 text-xs font-semibold text-white sm:col-span-2" disabled={pending || reason.trim().length < 10} type="button" onClick={() => respond("REVISE")}>Enviar cambio para aceptación</button>
    </div> : null}
  </div>;
}
