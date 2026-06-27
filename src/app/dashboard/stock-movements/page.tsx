import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockMovementsPage() {
  const movements = await prisma.stockMovement.findMany({
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Stock movements</h1>
      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Previous</th>
              <th className="px-4 py-3">New</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Note</th>
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
