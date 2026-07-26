"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reviewCustomMachine } from "@/app/actions/manufacturing";

export function CustomMachineReviewButtons({ machineId }: { machineId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function review(approve: boolean) {
    startTransition(async () => {
      const result = await reviewCustomMachine(machineId, approve);
      setMessage(result.ok ? "Revisada" : result.error);
      if (result.ok) router.refresh();
    });
  }
  return <div><div className="flex gap-2"><button className="rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white" disabled={pending} type="button" onClick={() => review(true)}>Aprobar</button><button className="rounded border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700" disabled={pending} type="button" onClick={() => review(false)}>Rechazar</button></div>{message ? <p className="mt-1 text-xs text-slate-500">{message}</p> : null}</div>;
}
