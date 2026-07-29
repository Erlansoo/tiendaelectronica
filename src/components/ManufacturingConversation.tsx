"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sendManufacturingMessage } from "@/app/actions/manufacturing";

export type ConversationMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderName: string;
  mine: boolean;
};

export function ManufacturingConversation({ orderId, messages }: { orderId: string; messages: ConversationMessage[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      const result = await sendManufacturingMessage(orderId, body);
      setMessage(result.ok ? null : result.error);
      if (result.ok) {
        setBody("");
        router.refresh();
      }
    });
  }

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Chat de la orden</h3>
      <p className="mt-1 text-xs text-slate-500">Mensajes privados, auditables y sin archivos adjuntos.</p>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded bg-slate-50 p-3">
        {messages.length ? messages.map((entry) => (
          <div className={`max-w-[88%] rounded-md px-3 py-2 text-sm ${entry.mine ? "ml-auto bg-[#17645e] text-white" : "bg-white text-slate-800 shadow-sm"}`} key={entry.id}>
            <p className="text-xs font-semibold opacity-80">{entry.senderName}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{entry.body}</p>
            <p className="mt-1 text-[10px] opacity-70">{new Date(entry.createdAt).toLocaleString("es-BO")}</p>
          </div>
        )) : <p className="py-3 text-center text-xs text-slate-500">Aún no hay mensajes.</p>}
      </div>
      <div className="mt-3 grid gap-2">
        <textarea className="min-h-20 rounded-md border border-slate-300 p-2 text-sm" value={body} maxLength={2000} placeholder="Escribe una condición o consulta sobre la orden…" onChange={(event) => setBody(event.target.value)} />
        <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{body.length}/2000</span><button className="rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={pending || body.trim().length === 0} type="button" onClick={send}>{pending ? "Enviando…" : "Enviar mensaje"}</button></div>
        {message ? <p className="text-xs text-rose-700">{message}</p> : null}
      </div>
    </section>
  );
}
