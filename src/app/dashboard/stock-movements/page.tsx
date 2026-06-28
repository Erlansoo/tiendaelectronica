import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Movimientos de stock</h1>
      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">Anterior</th>
              <th className="px-4 py-3">Nuevo</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td className="px-4 py-3 text-slate-700">{movement.createdAt.toLocaleString("es-BO")}</td>
                <td className="px-4 py-3 font-medium text-slate-950">{movement.product.name}</td>
                <td className="px-4 py-3 text-slate-700">{movement.type}</td>
                <td className="px-4 py-3 text-slate-700">{movement.quantity}</td>
                <td className="px-4 py-3 text-slate-700">{movement.previousStock}</td>
                <td className="px-4 py-3 text-slate-700">{movement.newStock}</td>
                <td className="px-4 py-3 text-slate-700">{movement.reason}</td>
                <td className="px-4 py-3 text-slate-700">{movement.referenceType ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{movement.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
