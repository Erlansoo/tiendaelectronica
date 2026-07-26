"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finalizeManufacturerLogo, prepareManufacturerLogoUpload } from "@/app/actions/manufacturing";

export function ManufacturerLogoUpload({ currentUrl, name }: { currentUrl: string | null; name: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function upload(file: File | undefined) {
    if (!file) return;
    startTransition(async () => {
      setMessage(null);
      const prepared = await prepareManufacturerLogoUpload({ mimeType: file.type, sizeBytes: file.size });
      if (!prepared.ok) return setMessage(prepared.error);
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return setMessage("Storage no configurado.");
      const supabase = createClient(url, key);
      const { error } = await supabase.storage.from("manufacturer-logos").uploadToSignedUrl(prepared.data.path, prepared.data.token, file, { contentType: file.type });
      if (error) return setMessage("No se pudo subir el logo.");
      const finalized = await finalizeManufacturerLogo(prepared.data.path);
      setMessage(finalized.ok ? "Logo actualizado." : finalized.error);
      if (finalized.ok) router.refresh();
    });
  }
  return <div className="flex flex-wrap items-center gap-4 rounded-md border bg-slate-50 p-4 md:col-span-2">
    {currentUrl
      // eslint-disable-next-line @next/next/no-img-element
      ? <img className="h-16 w-16 rounded-md border bg-white object-contain" src={currentUrl} alt={`Logo de ${name}`} />
      : <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-900 text-xl font-bold text-white">{name.slice(0, 1).toUpperCase()}</div>}
    <label className="grid gap-1 text-sm font-semibold">Logo público (JPG, PNG o WebP; máximo 2 MB)<input className="text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-white" disabled={pending} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event.target.files?.[0])} /></label>
    {message ? <p className="w-full text-xs text-slate-600">{message}</p> : null}
  </div>;
}
