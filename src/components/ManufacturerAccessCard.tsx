"use client";

import { createClient } from "@supabase/supabase-js";
import { Factory, KeyRound, Send, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  activateManufacturerCode,
  finalizeManufacturerApplication,
  startManufacturerApplication,
} from "@/app/actions/manufacturing";

type Props = {
  capabilityStatus: "ONBOARDING" | "ACTIVE" | "SUSPENDED" | null;
  application: {
    status: "DRAFT" | "PENDING" | "NEEDS_INFO" | "APPROVED" | "REJECTED";
    adminNotes: string | null;
  } | null;
};

const inputClass = "h-11 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-[#17645e] focus:ring-2 focus:ring-[#17645e]/15";

export function ManufacturerAccessCard({ capabilityStatus, application }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"request" | "code">("request");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (capabilityStatus) {
    return (
      <div className={`rounded-md border p-4 ${capabilityStatus === "SUSPENDED" ? "border-red-200 bg-red-50" : "border-[#17645e]/25 bg-[#edf8f6]"}`}>
        <div className="flex items-center gap-2">
          <Factory size={20} />
          <h2 className="font-semibold text-black">Usuario manufacturero</h2>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          {capabilityStatus === "ACTIVE"
            ? "Tu perfil está activo en el marketplace de impresión 3D."
            : capabilityStatus === "ONBOARDING"
              ? "Completa máquinas, materiales, inventario y costos para publicar tu perfil."
              : "Tu capacidad está suspendida. Contacta a Nubel para revisar el caso."}
        </p>
        {capabilityStatus !== "SUSPENDED" ? (
          <Link className="mt-4 inline-flex rounded-full bg-[#0f3d3d] px-4 py-2 text-sm font-semibold text-white" href="/cuenta/manufactura">
            Abrir panel manufacturero
          </Link>
        ) : null}
      </div>
    );
  }

  async function submitApplication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const files = formData.getAll("evidence").filter((value): value is File => value instanceof File && value.size > 0);
    const links = String(formData.get("workLinks") ?? "")
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    const payload = {
      commercialName: formData.get("commercialName"),
      responsibleName: formData.get("responsibleName"),
      department: formData.get("department"),
      city: formData.get("city"),
      whatsapp: formData.get("whatsapp"),
      experience: formData.get("experience"),
      declaredMachines: formData.get("declaredMachines"),
      applicantNotes: formData.get("applicantNotes") || undefined,
      workLinks: links,
      technologies: [
        formData.get("technologyFdm") === "on" ? "FDM" : null,
        formData.get("technologyResin") === "on" ? "RESIN" : null,
      ].filter(Boolean),
      deliveryModes: [
        formData.get("localPickup") === "on" ? "LOCAL_PICKUP" : null,
        formData.get("nationalShipping") === "on" ? "NATIONAL_SHIPPING" : null,
      ].filter(Boolean),
    };

    startTransition(async () => {
      const prepared = await startManufacturerApplication(
        payload,
        files.map((file) => ({ name: file.name, mimeType: file.type, sizeBytes: file.size })),
      );
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }
      try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !anonKey) throw new Error("Storage no configurado.");
        const supabase = createClient(supabaseUrl, anonKey);
        for (let index = 0; index < prepared.data.uploads.length; index += 1) {
          const upload = prepared.data.uploads[index];
          const { error: uploadError } = await supabase.storage
            .from("manufacturer-evidence")
            .uploadToSignedUrl(upload.path, upload.token, files[index], {
              contentType: files[index].type,
              upsert: false,
            });
          if (uploadError) throw uploadError;
        }
        const finalized = await finalizeManufacturerApplication(prepared.data.applicationId);
        if (!finalized.ok) {
          setError(finalized.error);
          return;
        }
        setMessage(finalized.message ?? "Solicitud enviada.");
        form.reset();
        router.refresh();
      } catch (uploadError) {
        console.error(uploadError);
        setError("Una evidencia no pudo cargarse. Intenta enviar la solicitud nuevamente.");
      }
    });
  }

  function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    startTransition(async () => {
      const result = await activateManufacturerCode(code);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Acceso activado.");
      router.refresh();
      setTimeout(() => setOpen(false), 900);
    });
  }

  return (
    <>
      <div className="rounded-md border border-[#f5a524]/40 bg-[#fff9eb] p-4">
        <div className="flex items-center gap-2">
          <Factory size={20} />
          <h2 className="font-semibold text-black">Solicitar o ingresar acceso manufacturero</h2>
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          Ofrece impresión FDM o resina después de la verificación personal de Nubel.
        </p>
        {application ? (
          <div className="mt-3 rounded-md border border-black/10 bg-white p-3 text-sm">
            <strong>Solicitud: {statusLabel(application.status)}</strong>
            {application.adminNotes ? <p className="mt-1 text-neutral-600">{application.adminNotes}</p> : null}
          </div>
        ) : null}
        <button className="mt-4 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => setOpen(true)}>
          Solicitar o ingresar
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="manufacturer-access-title">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-black" id="manufacturer-access-title">Acceso manufacturero</h2>
                <p className="mt-1 text-sm text-neutral-500">La aprobación no concede acceso al dashboard administrativo de Nubel.</p>
              </div>
              <button className="rounded-full p-2 hover:bg-neutral-100" type="button" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="flex border-b border-neutral-200 px-5 pt-3">
              <button className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "request" ? "border-[#17645e] text-[#17645e]" : "border-transparent text-neutral-500"}`} type="button" onClick={() => setTab("request")}>
                Solicitar acceso
              </button>
              <button className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === "code" ? "border-[#17645e] text-[#17645e]" : "border-transparent text-neutral-500"}`} type="button" onClick={() => setTab("code")}>
                Ingresar código
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {error ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
              {message ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-800">{message}</p> : null}
              {tab === "request" ? (
                <form className="grid gap-4" onSubmit={submitApplication}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nombre comercial"><input className={inputClass} name="commercialName" required maxLength={120} /></Field>
                    <Field label="Responsable"><input className={inputClass} name="responsibleName" required maxLength={120} /></Field>
                    <Field label="Departamento"><input className={inputClass} name="department" required maxLength={80} /></Field>
                    <Field label="Ciudad"><input className={inputClass} name="city" required maxLength={80} /></Field>
                    <Field label="WhatsApp"><input className={inputClass} name="whatsapp" required maxLength={30} inputMode="tel" /></Field>
                  </div>
                  <Field label="Experiencia y capacidad actual">
                    <textarea className="min-h-28 rounded-md border border-neutral-300 p-3 text-sm" name="experience" required minLength={30} maxLength={3000} />
                  </Field>
                  <Field label="Máquinas declaradas">
                    <textarea className="min-h-20 rounded-md border border-neutral-300 p-3 text-sm" name="declaredMachines" required maxLength={2000} placeholder="Marca, modelo, cantidad y estado" />
                  </Field>
                  <ChoiceGroup title="Tecnologías">
                    <Check name="technologyFdm" label="FDM / filamento" />
                    <Check name="technologyResin" label="Resina / MSLA" />
                  </ChoiceGroup>
                  <ChoiceGroup title="Modalidades de entrega">
                    <Check name="localPickup" label="Retiro local" />
                    <Check name="nationalShipping" label="Envío nacional" />
                  </ChoiceGroup>
                  <Field label="Enlaces de trabajos (uno por línea)">
                    <textarea className="min-h-20 rounded-md border border-neutral-300 p-3 text-sm" name="workLinks" placeholder="https://..." />
                  </Field>
                  <Field label="Notas adicionales">
                    <textarea className="min-h-20 rounded-md border border-neutral-300 p-3 text-sm" name="applicantNotes" maxLength={2000} />
                  </Field>
                  <Field label="Fotografías privadas del equipo o taller (1–5, 10 MB cada una)">
                    <input className={inputClass} name="evidence" type="file" accept="image/jpeg,image/png,image/webp" multiple required />
                  </Field>
                  <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-600">
                    Las fotografías son privadas y se usan únicamente para verificación por Nubel. No aparecerán en tu perfil público.
                  </p>
                  <button className="flex items-center justify-center gap-2 rounded-md bg-[#0f3d3d] px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={isPending} type="submit">
                    <Send size={17} /> {isPending ? "Enviando de forma segura…" : "Enviar solicitud"}
                  </button>
                </form>
              ) : (
                <form className="mx-auto max-w-md py-8" onSubmit={submitCode}>
                  <KeyRound className="mx-auto text-[#17645e]" size={34} />
                  <h3 className="mt-3 text-center text-lg font-semibold">Código personal de activación</h3>
                  <p className="mt-2 text-center text-sm text-neutral-600">Debe tener 20 caracteres, ser usado dentro de siete días y corresponder a esta misma cuenta Google.</p>
                  <input className={`${inputClass} mt-5 w-full font-mono uppercase tracking-[0.22em]`} name="code" minLength={20} maxLength={20} pattern="[A-Za-z2-9]{20}" autoComplete="one-time-code" required />
                  <button className="mt-4 w-full rounded-md bg-black px-4 py-3 font-semibold text-white disabled:opacity-50" disabled={isPending} type="submit">
                    {isPending ? "Verificando…" : "Activar acceso"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-semibold text-neutral-800">{label}{children}</label>;
}

function ChoiceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="rounded-md border border-neutral-200 p-3"><legend className="px-1 text-sm font-semibold">{title}</legend><div className="flex flex-wrap gap-5">{children}</div></fieldset>;
}

function Check({ name, label }: { name: string; label: string }) {
  return <label className="flex items-center gap-2 text-sm text-neutral-700"><input name={name} type="checkbox" />{label}</label>;
}

function statusLabel(status: Props["application"] extends infer T ? T extends { status: infer S } ? S : never : never) {
  return {
    DRAFT: "borrador",
    PENDING: "en revisión",
    NEEDS_INFO: "requiere información",
    APPROVED: "aprobada; espera tu código",
    REJECTED: "rechazada",
  }[status];
}

