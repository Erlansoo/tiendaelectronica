import { StockMovementReason } from "@prisma/client";
import { adjustStock } from "@/app/actions/stock";
import { StockBadge } from "@/components/StockBadge";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const products = await prisma.product.findMany({
    include: { stockMovements: { take: 1, orderBy: { createdAt: "desc" } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Inventory</h1>
      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Min</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Last movement</th>
              <th className="px-4 py-3">Adjust</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-medium text-slate-950">{product.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{product.sku}</td>
                <td className="px-4 py-3 text-slate-700">{product.stock}</td>
                <td className="px-4 py-3 text-slate-700">{product.minStock}</td>
                <td className="px-4 py-3"><StockBadge product={product} /></td>
                <td className="px-4 py-3 text-slate-700">{product.location ?? "-"}</td>
                <td className="px-4 py-3 text-slate-700">{product.stockMovements[0]?.reason ?? "-"}</td>
                <td className="px-4 py-3">
                  <form action={adjustStock} className="grid min-w-[360px] grid-cols-[80px_1fr_1fr_auto] gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <input className="h-9 rounded-md border border-slate-300 px-2" name="newStock" type="number" min={0} defaultValue={product.stock} />
                    <select className="h-9 rounded-md border border-slate-300 px-2" name="reason" defaultValue={StockMovementReason.MANUAL_ADJUSTMENT}>
                      {Object.values(StockMovementReason).map((reason) => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                    <input className="h-9 rounded-md border border-slate-300 px-2" name="notes" placeholder="Reason note" required />
                    <button className="rounded-md bg-slate-950 px-3 text-xs font-semibold text-white">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
