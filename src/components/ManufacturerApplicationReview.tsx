"use client";

import { CheckCircle2, Clipboard, HelpCircle, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { reviewManufacturerApplication } from "@/app/actions/manufacturing";

export function ManufacturerApplicationReview({ applicationId, status }: { applicationId: string; status: string }) {
  const [notes, setNotes] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function review(decision: "NEEDS_INFO" | "REJECTED" | "APPROVED") {
    setFeedback(null);
    startTransition(async () => {
      const result = await reviewManufacturerApplication(applicationId, decision, notes);
      if (!result.ok) return setFeedback(result.error);
      setCode(result.data.code ?? null);
      setFeedback(result.message ?? "Solicitud actualizada.");
    });
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <label className="grid gap-1 text-sm font-semibold text-slate-800">
        Nota para el solicitante
        <textarea className="min-h-20 rounded-md border border-slate-300 p-3 font-normal" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      {feedback ? <p className="mt-3 rounded-md bg-slate-100 p-3 text-sm">{feedback}</p> : null}
      {code ? (
        <div className="mt-3 rounded-md border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Código de un solo uso. Cópialo ahora: no volverá a mostrarse.</p>
          <div className="mt-2 flex items-center gap-3">
            <code className="rounded bg-white px-3 py-2 text-lg font-black tracking-[0.16em] text-black">{code}</code>
            <button className="rounded-md border border-amber-400 bg-white p-2" type="button" onClick={() => navigator.clipboard.writeText(code)} aria-label="Copiar código"><Clipboard size={18} /></button>
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50" disabled={pending} type="button" onClick={() => review("NEEDS_INFO")}><HelpCircle size={16} /> Pedir información</button>
        <button className="inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50" disabled={pending} type="button" onClick={() => review("REJECTED")}><XCircle size={16} /> Rechazar</button>
        <button className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending || status === "APPROVED"} type="button" onClick={() => review("APPROVED")}><CheckCircle2 size={16} /> Aprobar y generar código</button>
      </div>
    </div>
  );
}

