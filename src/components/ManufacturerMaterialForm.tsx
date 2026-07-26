"use client";

import { useMemo, useState } from "react";
import { addMaterialVariant } from "@/app/actions/manufacturing";
import { ManufacturerFieldHelp } from "@/components/ManufacturerFieldHelp";

type MaterialOption = {
  id: string;
  technology: "FDM" | "RESIN";
  name: string;
  defaultDensityGcm3: string | null;
};

const input = "h-10 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm";

export function ManufacturerMaterialForm({ materials }: { materials: MaterialOption[] }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const material = useMemo(() => materials.find((item) => item.id === materialId) ?? materials[0], [materialId, materials]);
  const isFdm = material?.technology === "FDM";
  const unit = isFdm ? "g" : "ml";
  const costUnit = isFdm ? "kg" : "litro";

  return <form action={addMaterialVariant} className="grid gap-3 rounded-md border bg-slate-50 p-4 md:grid-cols-4">
    <Field label={<ManufacturerFieldHelp label="Material" help="Selecciona el material exacto que realmente tienes disponible. FDM usa filamento; resina usa líquido de impresión." />}>
      <select className={input} name="materialId" value={materialId} onChange={(event) => setMaterialId(event.target.value)} required>
        {materials.map((item) => <option value={item.id} key={item.id}>{item.technology} · {item.name}</option>)}
      </select>
    </Field>
    <Field label={<ManufacturerFieldHelp label="Color" help="Nombre comercial del color que podrás entregar. Solo recibirás cotizaciones que coincidan con este color." />}><input className={input} name="colorName" required /></Field>
    <Field label={<ManufacturerFieldHelp label="Color visual" help="Muestra una referencia de color en tu inventario. Debe aproximarse al material físico que declaras." />}><input className={`${input} w-full p-1`} name="colorHex" type="color" defaultValue="#000000" /></Field>
    <Field label={<ManufacturerFieldHelp label={`Costo Bs/${costUnit}`} help={isFdm ? "Costo de compra de un kilogramo de este filamento. El sistema lo convierte a gramos para cada cotización." : "Costo de compra de un litro de esta resina. El sistema lo convierte a mililitros para cada cotización."} />}><input className={input} name="costPerBaseUnitBob" type="number" min="0.01" step="0.01" inputMode="decimal" required /></Field>
    <Field label={<ManufacturerFieldHelp label="Densidad g/cm³ (FDM)" help="Peso del filamento por volumen. Se usa para convertir el volumen del modelo en gramos. No aplica a resina." />}><input className={input} name="densityGcm3" type="number" min="0.1" max="5" step="0.0001" defaultValue={material?.defaultDensityGcm3 ?? "1.24"} disabled={!isFdm} required={isFdm} key={material?.id} /></Field>
    <Field label={<ManufacturerFieldHelp label="Desperdicio %" help="Porcentaje adicional para purgas, fallos, soportes o pérdidas. Se suma al consumo calculado del material." />}><input className={input} name="wastePercent" type="number" min="0" max="100" step="0.1" defaultValue="10" inputMode="decimal" required /></Field>
    <Field label={<ManufacturerFieldHelp label={`Inventario inicial (${unit})`} help={isFdm ? "Filamento disponible en gramos. Ejemplo: un rollo nuevo de 1 kg se registra como 1000 g." : "Resina disponible en mililitros. Ejemplo: una botella nueva de 1 litro se registra como 1000 ml."} />}><input className={input} name="availableQuantity" type="number" min="0" step="0.001" defaultValue="0" inputMode="decimal" required /></Field>
    <button className="self-end rounded-md bg-[#17645e] px-4 py-2.5 text-sm font-semibold text-white" type="submit">Añadir variante {isFdm ? "FDM" : "de resina"}</button>
    <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-950 md:col-span-4">{isFdm ? "Filamento seleccionado: el precio se registra en Bs/kg y el inventario en gramos." : "Resina seleccionada: el precio se registra en Bs/litro y el inventario en mililitros."}</p>
  </form>;
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return <label className="grid min-w-0 gap-1 text-sm font-semibold">{label}{children}</label>;
}
