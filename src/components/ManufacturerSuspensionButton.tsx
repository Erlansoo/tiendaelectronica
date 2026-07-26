"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { suspendManufacturer } from "@/app/actions/manufacturing";

export function ManufacturerSuspensionButton({ capabilityId, suspended }: { capabilityId: string; suspended: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      {error ? <p className="mb-2 text-xs text-red-700">{error}</p> : null}
      <button
        className={`rounded-md px-3 py-2 text-sm font-semibold ${suspended ? "bg-emerald-700 text-white" : "border border-red-300 text-red-700"}`}
        disabled={pending}
        type="button"
        onClick={() => startTransition(async () => {
          const result = await suspendManufacturer(capabilityId, !suspended);
          if (!result.ok) setError(result.error);
          else router.refresh();
        })}
      >
        {pending ? "Guardando…" : suspended ? "Reactivar" : "Suspender"}
      </button>
    </div>
  );
}

