import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SalesPage() {
  const sales = await prisma.sale.findMany({
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Sales</h1>
          <p className="mt-1 text-sm text-slate-600">Manual sales history.</p>
        </div>
        <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" href="/dashboard/ventas/nueva">
          New sale
        </Link>
      </div>
      <div className="mt-5 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{sale.saleNumber}</td>
                <td className="px-4 py-3 text-slate-700">{sale.customerName ?? "Walk-in"}</td>
                <td className="px-4 py-3 text-slate-700">{sale.items.length}</td>
                <td className="px-4 py-3 text-slate-700">{sale.saleStatus}</td>
                <td className="px-4 py-3 text-slate-700">{sale.paymentMethod}</td>
                <td className="px-4 py-3 font-semibold text-slate-950">{formatMoney(sale.total.toString())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
