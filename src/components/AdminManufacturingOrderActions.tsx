"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmMockManufacturingPayment, markManufacturingPayoutPaid } from "@/app/actions/manufacturing";

export function AdminManufacturingOrderActions({ orderId, paymentPending, payoutReady }: { orderId: string; paymentPending: boolean; payoutReady: boolean }) {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function run(action: "PAYMENT" | "PAYOUT") {
    startTransition(async () => {
      const result = action === "PAYMENT" ? await confirmMockManufacturingPayment(orderId) : await markManufacturingPayoutPaid(orderId, reference);
      setMessage(result.ok ? result.message ?? "Guardado." : result.error);
      if (result.ok) router.refresh();
    });
  }
  return <div className="mt-3 flex flex-wrap items-end gap-2">
    {paymentPending ? <button className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending} type="button" onClick={() => run("PAYMENT")}>Confirmar pago de prueba</button> : null}
    {payoutReady ? <><input className="h-9 rounded border px-2 text-xs" value={reference} maxLength={120} placeholder="Referencia de desembolso" onChange={(event) => setReference(event.target.value)} /><button className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || reference.trim().length < 3} type="button" onClick={() => run("PAYOUT")}>Registrar desembolso</button></> : null}
    {message ? <p className="w-full text-xs text-slate-700">{message}</p> : null}
  </div>;
}
