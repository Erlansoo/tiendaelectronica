"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewManufacturingDispute } from "@/app/actions/manufacturing";

export function AdminManufacturingDisputeReview({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function decide(decision: "RELEASE_PAYOUT" | "KEEP_ON_HOLD" | "CANCEL_ORDER") {
    startTransition(async () => {
      const result = await reviewManufacturingDispute(orderId, decision, notes);
      setMessage(result.ok ? result.message ?? "Guardado." : result.error);
      if (result.ok) router.refresh();
    });
  }
  return <div className="mt-3 grid gap-2 rounded border border-rose-200 bg-white p-3"><label className="text-xs font-semibold">Notas de investigación<textarea className="mt-1 min-h-20 w-full rounded border p-2 font-normal" value={notes} minLength={10} maxLength={3000} onChange={(event) => setNotes(event.target.value)} /></label><div className="flex flex-wrap gap-2"><button className="rounded border border-amber-400 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50" disabled={pending || notes.trim().length < 10} type="button" onClick={() => decide("KEEP_ON_HOLD")}>Mantener retenido</button><button className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || notes.trim().length < 10} type="button" onClick={() => decide("RELEASE_PAYOUT")}>Autorizar desembolso</button><button className="rounded bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || notes.trim().length < 10} type="button" onClick={() => decide("CANCEL_ORDER")}>Cancelar orden</button></div>{message ? <p className="text-xs text-slate-700">{message}</p> : null}</div>;
}
