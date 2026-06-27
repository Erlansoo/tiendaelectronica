import Link from "next/link";
import { ArrowRight, Cpu, PackageSearch } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { SearchInput } from "@/components/SearchInput";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredProducts, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid min-h-[560px] max-w-7xl content-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Cpu size={16} aria-hidden />
              Nubel Systems · Store
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Nubel Store
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Public catalog for electronic components, connected to Nubel Systems and its embedded systems manufacturing work.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchInput placeholder="Search MOSFET, HC-12, Arduino, SKU..." />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" href="/productos">
                Browse catalog
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link className="inline-flex items-center rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-100" href="/dashboard">
                Dashboard
              </Link>
            </div>
          </div>
          <div className="grid content-center gap-3">
            {categories.slice(0, 5).map((category) => (
              <Link
                key={category.category}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-400"
                href={`/productos?q=${encodeURIComponent(category.category)}`}
              >
                <span className="font-semibold text-slate-950">{category.category}</span>
                <span className="text-sm text-slate-500">{category._count.category} products</span>
              </Link>
            ))}
            {categories.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                <PackageSearch className="mx-auto mb-3" aria-hidden />
                Run the seed to load initial products.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Featured products</h2>
            <p className="mt-1 text-sm text-slate-600">Initial inventory and highlighted components.</p>
          </div>
          <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/productos">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </main>
  );
}
