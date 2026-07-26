"use client";

import { useEffect, useState } from "react";

const sections = [
  ["resumen", "Resumen"],
  ["perfil", "Perfil"],
  ["maquinas", "Máquinas"],
  ["materiales", "Materiales"],
  ["inventario", "Inventario"],
  ["calculadora", "Calculadora"],
  ["trabajos", "Trabajos"],
] as const;

export function ManufacturerDashboardNav() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number][0]>("resumen");

  useEffect(() => {
    let frame = 0;
    const updateActiveSection = () => {
      frame = 0;
      const offset = 145;
      const visible = sections
        .map(([id]) => ({ id, top: document.getElementById(id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY }))
        .filter((section) => section.top <= offset)
        .at(-1);
      setActiveSection(visible?.id ?? "resumen");
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection);
    };
    updateActiveSection();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  return <nav aria-label="Secciones del panel manufacturero" className="sticky top-20 z-30 mt-6 flex gap-1 overflow-x-auto rounded-md border border-slate-300 bg-white/95 p-2 text-sm font-semibold shadow-sm backdrop-blur">
    {sections.map(([id, label]) => <a
      aria-current={activeSection === id ? "location" : undefined}
      className={`whitespace-nowrap rounded px-3 py-2 transition-colors ${activeSection === id ? "bg-[#f5a524] text-black shadow-sm" : "text-slate-800 hover:bg-[#f5a524]/45 hover:text-black"}`}
      href={`#${id}`}
      key={id}
      onClick={() => setActiveSection(id)}
    >{label}</a>)}
  </nav>;
}
