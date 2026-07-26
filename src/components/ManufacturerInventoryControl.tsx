"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustMaterialInventory, publishManufacturerProfile } from "@/app/actions/manufacturing";

export function ManufacturerInventoryControl({ variantId }: { variantId: string }) {
  const router = useRouter();
  const [delta, setDelta] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex min-w-[280px] flex-wrap items-end gap-2">
      <label className="grid gap-1 text-xs font-semibold">Ajuste (+ / −)<input className="h-9 w-24 rounded border px-2 text-sm" type="number" step="0.001" value={delta} onChange={(event) => setDelta(event.target.value)} /></label>
      <label className="grid gap-1 text-xs font-semibold">Motivo<input className="h-9 w-36 rounded border px-2 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <button className="h-9 rounded bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || !delta || notes.length < 3} type="button" onClick={() => startTransition(async () => {
        const result = await adjustMaterialInventory(variantId, Number(delta), notes);
        setMessage(result.ok ? "Guardado" : result.error);
        if (result.ok) {
          setDelta("");
          setNotes("");
          router.refresh();
        }
      })}>Aplicar</button>
      {message ? <span className="w-full text-xs text-slate-600">{message}</span> : null}
    </div>
  );
}

export function PublishManufacturerButton({ isPublic }: { isPublic: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <button className="rounded-md bg-[#f5a524] px-4 py-2 text-sm font-bold text-black disabled:opacity-50" disabled={pending || isPublic} type="button" onClick={() => startTransition(async () => {
        const result = await publishManufacturerProfile();
        setMessage(result.ok ? result.message ?? "Perfil publicado." : result.error);
        if (result.ok) router.refresh();
      })}>{isPublic ? "Perfil publicado" : pending ? "Validando…" : "Publicar perfil"}</button>
      {message ? <p className="mt-2 max-w-sm text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}

