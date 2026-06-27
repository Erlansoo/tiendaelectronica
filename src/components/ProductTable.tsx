import type { Product } from "@prisma/client";
import Link from "next/link";
import { Eye, Pencil } from "lucide-react";
import { toggleProductActive } from "@/app/actions/products";
import { formatMoney } from "@/lib/format";
import { StockBadge } from "@/components/StockBadge";

export function ProductTable({ products }: { products: Product[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Stock</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Published</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id}>
              <td className="px-4 py-3 font-mono text-xs text-slate-700">{product.sku}</td>
              <td className="px-4 py-3 font-medium text-slate-950">{product.name}</td>
              <td className="px-4 py-3 text-slate-600">{product.category}</td>
              <td className="px-4 py-3 text-slate-600">{product.stock}</td>
              <td className="px-4 py-3 text-slate-600">{formatMoney(product.priceSale.toString())}</td>
              <td className="px-4 py-3">
                <StockBadge product={product} />
              </td>
              <td className="px-4 py-3">
                <form action={toggleProductActive.bind(null, product.id, product.isActive)}>
                  <button className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                    {product.isActive ? "Published" : "Hidden"}
                  </button>
                </form>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link className="rounded-md p-2 text-slate-600 hover:bg-slate-100" href={`/dashboard/productos/${product.id}/editar`} title="Edit">
                    <Pencil size={16} aria-hidden />
                  </Link>
                  <Link className="rounded-md p-2 text-slate-600 hover:bg-slate-100" href={`/productos/${product.slug}`} title="View in store">
                    <Eye size={16} aria-hidden />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
