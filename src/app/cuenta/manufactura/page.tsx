import Link from "next/link";
import { CircleHelp } from "lucide-react";
import {
  addManufacturerMachine,
  addMaterialVariant,
  saveMachineQualityProfile,
  saveManufacturerProfile,
  savePricingProfile,
} from "@/app/actions/manufacturing";
import { ManufacturerInventoryControl, PublishManufacturerButton } from "@/components/ManufacturerInventoryControl";
import { ManufacturerLogoUpload } from "@/components/ManufacturerLogoUpload";
import { ProviderOfferActions } from "@/components/ProviderOfferActions";
import { PublicHeader } from "@/components/PublicHeader";
import { requireManufacturerCapability } from "@/lib/manufacturing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const input = "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm";

export default async function ManufacturerDashboardPage() {
  const { capability } = await requireManufacturerCapability();
  const [profile, printerCatalog, materials] = await Promise.all([
    prisma.manufacturerProfile.findUniqueOrThrow({
      where: { capabilityId: capability.id },
      include: {
        machines: { orderBy: { createdAt: "desc" }, include: { catalog: true, qualityProfiles: true } },
        materialVariants: { orderBy: { createdAt: "desc" }, include: { material: true, movements: { take: 3, orderBy: { createdAt: "desc" } } } },
        pricingProfiles: true,
        offers: { take: 10, orderBy: { createdAt: "desc" }, include: { quote: true } },
      },
    }),
    prisma.printerCatalog.findMany({ where: { isActive: true }, orderBy: [{ technology: "asc" }, { brand: "asc" }, { model: "asc" }] }),
    prisma.materialCatalog.findMany({ where: { isActive: true }, orderBy: [{ technology: "asc" }, { name: "asc" }] }),
  ]);

  const completeSteps = [
    Boolean(profile.description && profile.responsibilityAcceptedAt),
    profile.machines.some((machine) => machine.reviewStatus === "ACTIVE"),
    profile.materialVariants.some((variant) => variant.isActive),
    profile.pricingProfiles.length > 0,
  ].filter(Boolean).length;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link className="text-sm font-semibold text-[#17645e]" href="/cuenta">← Panel de usuario</Link>
            <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#17645e]">Manufactura 3D</p>
            <h1 className="mt-1 text-3xl font-semibold">{profile.commercialName}</h1>
            <p className="mt-2 text-sm text-slate-600">Estado: {capability.status} · Configuración {completeSteps}/4</p>
          </div>
          <PublishManufacturerButton isPublic={profile.isPublic} />
        </div>

        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-md border bg-white p-2 text-sm font-semibold">
          {["resumen", "perfil", "maquinas", "materiales", "inventario", "calculadora", "trabajos"].map((section) => <a className="whitespace-nowrap rounded px-3 py-2 hover:bg-slate-100" href={`#${section}`} key={section}>{section[0].toUpperCase() + section.slice(1)}</a>)}
        </nav>

        <section className="mt-6 grid gap-4 md:grid-cols-4" id="resumen">
          <Metric label="Máquinas activas" value={profile.machines.filter((machine) => machine.reviewStatus === "ACTIVE").length} />
          <Metric label="Variantes activas" value={profile.materialVariants.filter((variant) => variant.isActive).length} />
          <Metric label="Stock reservado" value={profile.materialVariants.reduce((sum, variant) => sum + Number(variant.reservedQuantity), 0).toFixed(2)} />
          <Metric label="Cotizaciones" value={profile.offers.length} />
        </section>

        <Panel id="perfil" title="Perfil público, contacto y responsabilidad" description="El logo, nombre, ciudad y modalidad se muestran al cotizar. Correo, WhatsApp y dirección exacta solo se comparten después de que el cliente elija tu oferta.">
          <form action={saveManufacturerProfile} className="grid gap-4 md:grid-cols-2">
            <ManufacturerLogoUpload currentUrl={profile.logoUrl} name={profile.commercialName} />
            <Field label="Nombre comercial"><input className={input} name="commercialName" defaultValue={profile.commercialName} required /></Field>
            <Field label="Ciudad"><input className={input} name="city" defaultValue={profile.city} required /></Field>
            <Field label="Departamento"><input className={input} name="department" defaultValue={profile.department} required /></Field>
            <Field label="WhatsApp de contacto"><input className={input} name="whatsapp" defaultValue={profile.whatsapp} required /></Field>
            <Field label="Correo de contacto"><input className={input} name="contactEmail" type="email" defaultValue={profile.contactEmail ?? ""} required /></Field>
            <Field label="Plazo habitual (días)"><input className={input} name="usualLeadTimeDays" defaultValue={profile.usualLeadTimeDays} type="number" min={1} max={90} required /></Field>
            <fieldset className="rounded-md border p-3"><legend className="px-1 text-sm font-semibold">Entrega</legend><div className="flex gap-4 text-sm"><Check name="localPickup" label="Retiro local" defaultChecked={profile.deliveryModes.includes("LOCAL_PICKUP")} /><Check name="nationalShipping" label="Envío nacional" defaultChecked={profile.deliveryModes.includes("NATIONAL_SHIPPING")} /></div></fieldset>
            <Field label="Dirección de retiro local" full><input className={input} name="localPickupAddress" defaultValue={profile.localPickupAddress ?? ""} placeholder="Zona, calle, número, referencia y horario de retiro" maxLength={300} /></Field>
            <Field label="Ubicación en Google Maps (opcional)" full><input className={input} name="localPickupMapUrl" type="url" defaultValue={profile.localPickupMapUrl ?? ""} placeholder="https://maps.google.com/..." maxLength={2048} /></Field>
            <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 md:col-span-2">Si ofreces retiro local, la dirección es obligatoria. La dirección, enlace del mapa, WhatsApp y correo solo se muestran al cliente que elija tu oferta.</p>
            <Field label="Descripción pública" full><textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm" name="description" defaultValue={profile.description ?? ""} minLength={30} maxLength={1500} required /></Field>
            <label className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm md:col-span-2">
              <input className="mt-1" name="acceptResponsibility" type="checkbox" defaultChecked={Boolean(profile.responsibilityAcceptedAt)} required={!profile.responsibilityAcceptedAt} />
              Declaro que máquinas, materiales, colores, inventario, precios y plazos publicados son reales y que responderé por su disponibilidad y cumplimiento.
            </label>
            <button className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white md:w-fit" type="submit">Guardar perfil</button>
          </form>
        </Panel>

        <Panel id="maquinas" title="Tecnologías y máquinas" description="Los modelos del catálogo se activan de inmediato. Las máquinas personalizadas requieren revisión de Nubel.">
          <div className="grid gap-4 lg:grid-cols-2">
            <form action={addManufacturerMachine} className="grid gap-3 rounded-md border p-4">
              <h3 className="font-semibold">Añadir del catálogo verificado</h3>
              <Field label="Modelo"><select className={input} name="catalogId" required>{printerCatalog.map((printer) => <option value={printer.id} key={printer.id}>{printer.technology} · {printer.brand} {printer.model} · {printer.buildWidthMm.toString()}×{printer.buildDepthMm.toString()}×{printer.buildHeightMm.toString()} mm</option>)}</select></Field>
              <MachineCosts />
              <button className="rounded-md bg-[#17645e] px-4 py-2 text-sm font-semibold text-white" type="submit">Añadir máquina verificada</button>
            </form>
            <form action={addManufacturerMachine} className="grid gap-3 rounded-md border p-4">
              <h3 className="font-semibold">Registrar máquina personalizada</h3>
              <Field label="Tecnología"><select className={input} name="technology"><option value="FDM">FDM</option><option value="RESIN">Resina</option></select></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Marca"><input className={input} name="customBrand" required /></Field><Field label="Modelo"><input className={input} name="customModel" required /></Field></div>
              <div className="grid grid-cols-3 gap-3"><Field label="X mm"><input className={input} name="buildWidthMm" type="number" step="0.001" required /></Field><Field label="Y mm"><input className={input} name="buildDepthMm" type="number" step="0.001" required /></Field><Field label="Z mm"><input className={input} name="buildHeightMm" type="number" step="0.001" required /></Field></div>
              <MachineCosts />
              <button className="rounded-md border border-[#17645e] px-4 py-2 text-sm font-semibold text-[#17645e]" type="submit">Enviar a revisión</button>
            </form>
          </div>
          <div className="mt-5 grid gap-3">
            {profile.machines.map((machine) => <article className="rounded-md bg-slate-50 p-3 text-sm" key={machine.id}>
              <div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{machine.catalog ? `${machine.catalog.brand} ${machine.catalog.model}` : `${machine.customBrand} ${machine.customModel}`}</strong><p className="text-slate-500">{machine.technology} · {machine.buildWidthMm.toString()}×{machine.buildDepthMm.toString()}×{machine.buildHeightMm.toString()} mm · {machine.quantity} unidad(es)</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{machine.reviewStatus}</span></div>
              <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 lg:grid-cols-3">
                {machine.qualityProfiles.map((quality) => <form action={saveMachineQualityProfile} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded-md border bg-white p-2" key={quality.id}>
                  <input name="machineId" type="hidden" value={machine.id} /><input name="quality" type="hidden" value={quality.quality} />
                  <Field label={`${quality.quality} · capa mm`}><input className={input} name="layerHeightMm" type="number" min="0.01" max="2" step="0.001" defaultValue={quality.layerHeightMm.toString()} required /></Field>
                  <Field label={machine.technology === "FDM" ? "Rendimiento cm³/h" : "Segundos por capa"}><input className={input} name="performance" type="number" min="0.01" step="0.001" defaultValue={(machine.technology === "FDM" ? quality.throughputCm3PerHour : quality.secondsPerLayer)?.toString() ?? ""} required /></Field>
                  <button className="h-10 rounded bg-slate-900 px-3 text-xs font-semibold text-white" type="submit">Guardar</button>
                </form>)}
              </div>
            </article>)}
          </div>
        </Panel>

        <Panel id="materiales" title="Materiales, colores e inventario" description="FDM se controla en gramos y costo por kilogramo; resina en mililitros y costo por litro.">
          <form action={addMaterialVariant} className="grid gap-3 rounded-md border bg-slate-50 p-4 md:grid-cols-4">
            <Field label="Material"><select className={input} name="materialId">{materials.map((material) => <option value={material.id} key={material.id}>{material.technology} · {material.name}</option>)}</select></Field>
            <Field label="Color"><input className={input} name="colorName" required /></Field>
            <Field label="Color visual"><input className={`${input} w-full p-1`} name="colorHex" type="color" defaultValue="#000000" /></Field>
            <Field label="Costo Bs/kg o Bs/litro"><input className={input} name="costPerBaseUnitBob" type="number" min="0.01" step="0.01" required /></Field>
            <Field label="Densidad g/cm³ (FDM)"><input className={input} name="densityGcm3" type="number" min="0.1" max="5" step="0.0001" defaultValue="1.24" required /></Field>
            <Field label="Desperdicio %"><input className={input} name="wastePercent" type="number" min="0" max="100" step="0.1" defaultValue="10" required /></Field>
            <Field label="Inventario inicial"><input className={input} name="availableQuantity" type="number" min="0" step="0.001" defaultValue="0" required /></Field>
            <button className="self-end rounded-md bg-[#17645e] px-4 py-2.5 text-sm font-semibold text-white" type="submit">Añadir variante</button>
          </form>
          <div className="mt-5 overflow-x-auto" id="inventario">
            <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100"><tr><th className="p-3">Variante</th><th className="p-3">Disponible</th><th className="p-3">Reservado</th><th className="p-3">Costo</th><th className="p-3">Movimiento auditable</th></tr></thead><tbody className="divide-y">
              {profile.materialVariants.map((variant) => <tr key={variant.id}><td className="p-3"><strong>{variant.material.name}</strong> · {variant.colorName}<br /><span className="text-xs text-slate-500">{variant.unit}</span></td><td className="p-3">{variant.availableQuantity.toString()}</td><td className="p-3">{variant.reservedQuantity.toString()}</td><td className="p-3">Bs {variant.costPerBaseUnitBob.toString()}</td><td className="p-3"><ManufacturerInventoryControl variantId={variant.id} /></td></tr>)}
            </tbody></table>
          </div>
        </Panel>

        <Panel id="calculadora" title="Calculadora de costos" description="El desglose es privado. El cliente solamente verá total, máquina, material, ciudad, entrega y plazo. Comisión Nubel: 0% en esta versión.">
          <div className="grid gap-4 lg:grid-cols-2">
            {(["FDM", "RESIN"] as const).map((technology) => {
              const current = profile.pricingProfiles.find((pricing) => pricing.technology === technology);
              return <form action={savePricingProfile} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2" key={technology}>
                <h3 className="text-lg font-semibold sm:col-span-2">{technology === "FDM" ? "FDM / filamento" : "Resina / MSLA"}</h3>
                <input name="technology" type="hidden" value={technology} />
                <CostField label="Electricidad Bs/kWh" name="electricityBobKwh" value={current?.electricityBobKwh.toString() ?? "0.8"} />
                <CostField label="Mano de obra Bs/h" name="laborBobPerHour" value={current?.laborBobPerHour.toString() ?? "20"} />
                <CostField label="Preparación (min)" name="setupMinutes" value={current?.setupMinutes ?? 20} />
                <CostField label="Postproceso (min)" name="postprocessMinutes" value={current?.postprocessMinutes ?? 20} />
                <CostField label="Consumibles Bs" name="consumablesBob" value={current?.consumablesBob.toString() ?? "2"} />
                <CostField label="Riesgo de fallo %" name="failureRiskPercent" value={current?.failureRiskPercent.toString() ?? "8"} />
                <CostField label="Margen %" name="marginPercent" value={current?.marginPercent.toString() ?? "25"} />
                <CostField label="Cobro mínimo Bs" name="minimumChargeBob" value={current?.minimumChargeBob.toString() ?? "20"} />
                <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white sm:col-span-2" type="submit">Guardar costos {technology}</button>
              </form>;
            })}
          </div>
        </Panel>

        <Panel id="trabajos" title="Cotizaciones y trabajos" description="Las estimaciones duran 72 horas. Una selección reservará material durante 24 horas.">
          {profile.offers.length ? <div className="grid gap-3">{profile.offers.map((offer) => <div className="rounded-md border p-3 text-sm" key={offer.id}><div className="flex flex-wrap justify-between gap-3"><span>{offer.quote.materialName} · {offer.quote.quality}</span><strong>Bs {offer.totalBob.toString()} · {offer.status}</strong></div>{offer.status === "SELECTED" ? <ProviderOfferActions offerId={offer.id} currentTotal={offer.totalBob.toString()} currentLeadTime={offer.leadTimeDays} /> : null}</div>)}</div> : <p className="text-sm text-slate-500">Aún no hay cotizaciones compatibles.</p>}
        </Panel>
      </main>
    </>
  );
}

function Panel({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="mt-6 scroll-mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm" id={id}><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p><div className="mt-5">{children}</div></section>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-md border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
function Field({ label, children, full = false }: { label: React.ReactNode; children: React.ReactNode; full?: boolean }) { return <label className={`grid gap-1 text-sm font-semibold ${full ? "md:col-span-2" : ""}`}>{label}{children}</label>; }
function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) { return <label className="flex items-center gap-2"><input name={name} type="checkbox" defaultChecked={defaultChecked} /> {label}</label>; }
function CostField({ label, name, value }: { label: string; name: string; value: string | number }) { return <Field label={label}><input className={input} name={name} defaultValue={value} min="0" step="0.01" type="number" required /></Field>; }
function MachineCosts() {
  return <div className="grid grid-cols-2 gap-3">
    <MachineCostField label="Cantidad" help="Número de máquinas físicas idénticas que tienes disponibles. Debe ser un número entero: 1, 2, 3…; no se pueden registrar fracciones de una máquina." name="quantity" value="1" min="1" max="100" step="1" inputMode="numeric" />
    <MachineCostField label="Compra Bs" help="Precio real que pagaste por una unidad de esta máquina. Se usa para calcular su depreciación por cada hora de impresión." name="purchasePriceBob" value="0" min="0" step="0.01" />
    <MachineCostField label="Residual Bs" help="Valor estimado de reventa de una unidad al final de su vida útil. Debe ser menor o igual al precio de compra; reduce la depreciación calculada." name="residualValueBob" value="0" min="0" step="0.01" />
    <MachineCostField label="Vida útil h" help="Horas de impresión que esperas usar la máquina antes de reemplazarla o hacer una renovación importante. Ejemplo habitual: 5.000 horas." name="usefulLifeHours" value="5000" min="1" step="1" />
    <MachineCostField label="Potencia W" help="Consumo eléctrico promedio de la máquina mientras imprime, expresado en watts. Revisa la ficha técnica o mide el consumo real para una cotización más precisa." name="powerWatts" value="0" min="0" step="0.01" />
    <MachineCostField label="Mantenimiento Bs/h" help="Monto que reservas por cada hora de impresión para boquillas, lubricación, repuestos, limpieza y reparaciones. No incluye filamento ni resina." name="maintenanceBobPerHour" value="0" min="0" step="0.01" />
  </div>;
}

function MachineCostField({ label, help, name, value, min, max, step, inputMode }: {
  label: string;
  help: string;
  name: string;
  value: string;
  min: string;
  max?: string;
  step: string;
  inputMode?: "numeric" | "decimal";
}) {
  return <Field label={<HelpLabel label={label} help={help} />}><input className={input} name={name} defaultValue={value} min={min} max={max} step={step} inputMode={inputMode} type="number" required /></Field>;
}

function HelpLabel({ label, help }: { label: string; help: string }) {
  return <span className="inline-flex items-center gap-1.5">
    {label}
    <span className="group relative inline-flex" tabIndex={0}>
      <CircleHelp aria-label={`Ayuda sobre ${label}`} className="cursor-help text-slate-500" size={16} />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-md bg-slate-950 px-3 py-2 text-xs font-normal leading-5 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100" role="tooltip">{help}</span>
    </span>
  </span>;
}
