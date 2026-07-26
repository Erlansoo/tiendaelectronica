import { ManufacturerSuspensionButton } from "@/components/ManufacturerSuspensionButton";
import { CustomMachineReviewButtons } from "@/components/CustomMachineReviewButtons";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ManufacturersAdminPage() {
  await requireStoreAdmin();
  const [capabilities, pendingMachines] = await Promise.all([
    prisma.accountCapability.findMany({
      where: { type: "MANUFACTURER" },
      orderBy: { createdAt: "desc" },
      include: {
        account: { select: { email: true, name: true } },
        profile: { include: { _count: { select: { machines: true, materialVariants: true, offers: true } } } },
      },
    }),
    prisma.manufacturerMachine.findMany({
      where: { catalogId: null, reviewStatus: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { manufacturer: true },
    }),
  ]);
  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Manufactureros 3D</h1>
      <p className="mt-2 text-slate-600">Control separado del dashboard electrónico. Suspender corta inmediatamente su capacidad pública.</p>
      <div className="mt-6 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Cuenta</th><th className="p-3">Perfil</th><th className="p-3">Estado</th><th className="p-3">Recursos</th><th className="p-3">Acción</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {capabilities.map((capability) => (
              <tr key={capability.id}>
                <td className="p-3"><strong>{capability.account.name}</strong><br /><span className="text-slate-500">{capability.account.email}</span></td>
                <td className="p-3">{capability.profile?.commercialName ?? "Sin perfil"}</td>
                <td className="p-3">{capability.status}</td>
                <td className="p-3">{capability.profile ? `${capability.profile._count.machines} máquinas · ${capability.profile._count.materialVariants} materiales · ${capability.profile._count.offers} ofertas` : "—"}</td>
                <td className="p-3"><ManufacturerSuspensionButton capabilityId={capability.id} suspended={capability.status === "SUSPENDED"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="mt-8 rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">Máquinas personalizadas pendientes</h2>
        <div className="mt-4 grid gap-3">
          {pendingMachines.map((machine) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm" key={machine.id}><div><strong>{machine.customBrand} {machine.customModel}</strong><p className="text-slate-500">{machine.manufacturer.commercialName} · {machine.technology} · {machine.buildWidthMm.toString()}×{machine.buildDepthMm.toString()}×{machine.buildHeightMm.toString()} mm</p></div><CustomMachineReviewButtons machineId={machine.id} /></div>)}
          {pendingMachines.length === 0 ? <p className="text-sm text-slate-500">No hay máquinas pendientes.</p> : null}
        </div>
      </section>
    </div>
  );
}
