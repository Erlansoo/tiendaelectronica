import { CircleHelp } from "lucide-react";

export function ManufacturerFieldHelp({ label, help }: { label: string; help: string }) {
  return <span className="inline-flex items-center gap-1.5">
    {label}
    <span className="group relative inline-flex" tabIndex={0}>
      <CircleHelp aria-label={`Ayuda sobre ${label}`} className="cursor-help text-slate-500" size={16} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-xs font-normal leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100" role="tooltip">{help}</span>
    </span>
  </span>;
}
