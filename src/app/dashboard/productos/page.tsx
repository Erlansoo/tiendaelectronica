import Link from "next/link";
import { ProductTable } from "@/components/ProductTable";
import { prisma } from "@/lib/prisma";
import { productSearchWhere } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function DashboardProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await prisma.product.findMany({
    where: productSearchWhere(q, true),
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Products</h1>
          <p className="mt-1 text-sm text-slate-600">Manage catalog, stock basics and publication state.</p>
        </div>
        <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" href="/dashboard/productos/nuevo">
          New product
        </Link>
      </div>
      <form className="mt-5" action="/dashboard/productos">
        <input className="h-11 w-full max-w-md rounded-md border border-slate-300 px-3 text-sm text-slate-950" name="q" defaultValue={q} placeholder="Search products" />
      </form>
      <div className="mt-5">
        <ProductTable products={products} />
      </div>
    </div>
  );
}
