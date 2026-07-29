"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acceptRevisedManufacturingOffer, selectManufacturingOffer } from "@/app/actions/manufacturing";

export function SelectManufacturingOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <button className="w-full rounded-md bg-[#0f3d3d] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="button" onClick={() => startTransition(async () => {
        const result = await selectManufacturingOffer(offerId);
        setMessage(result.ok ? result.message ?? "Oferta seleccionada." : result.error);
        if (result.ok) router.refresh();
      })}>{pending ? "Reservando material…" : "Elegir esta oferta"}</button>
      {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}

export function AcceptRevisedOfferButton({ offerId, revised = true }: { offerId: string; revised?: boolean }) {
  void revised;
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return <div>
    <button className="w-full rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="button" onClick={() => startTransition(async () => {
      const result = await acceptRevisedManufacturingOffer(offerId);
      setMessage(result.ok ? result.message ?? "Cambio aceptado." : result.error);
      if (result.ok) router.refresh();
    })}>{pending ? "Aceptando…" : "Aceptar nuevo precio y plazo"}</button>
    {message ? <p className="mt-2 text-xs text-slate-600">{message}</p> : null}
  </div>;
}
