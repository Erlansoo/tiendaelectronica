import Link from "next/link";
import {
  ArrowRight,
  Cpu,
  Factory,
  PackageCheck,
  PackageSearch,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="text-lg font-semibold text-slate-950">
            Nubel Store
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link className="hover:text-slate-950" href="/productos">
              Catalog
            </Link>
            <a className="hover:text-slate-950" href="#manufacturing">
              Manufacturing
            </a>
            <a className="hover:text-slate-950" href="#contact">
              Contact
            </a>
          </nav>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f1f5f9_100%)]">
        <div className="mx-auto grid min-h-[620px] max-w-7xl content-center gap-10 px-6 py-14 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              <Cpu size={16} aria-hidden />
              Nubel Systems Store
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-slate-950 sm:text-6xl">
              Components for builders, repairs and embedded systems.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Nubel Store is the electronic components catalog from Nubel Systems: MOSFETs, RF modules,
              sensors, boards and parts for real technical work in Bolivia.
            </p>
            <div className="mt-8 max-w-2xl">
              <SearchInput placeholder="Search MOSFET, HC-12, Arduino, SKU..." />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                href="/productos"
              >
                Browse catalog
                <ArrowRight size={16} aria-hidden />
              </Link>
              <a
                className="inline-flex items-center rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-white"
                href="#manufacturing"
              >
                Embedded systems
              </a>
            </div>
            <div className="mt-8 grid max-w-2xl gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <TrustItem icon={<PackageCheck size={18} />} label="Visible stock" />
              <TrustItem icon={<ShieldCheck size={18} />} label="Technical details" />
              <TrustItem icon={<RadioTower size={18} />} label="WhatsApp ordering" />
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live catalog</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Featured inventory</h2>
              </div>
              <Link className="text-sm font-semibold text-slate-900 hover:underline" href="/productos">
                View all
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {featuredProducts.slice(0, 3).map((product) => (
                <Link
                  key={product.id}
                  className="grid grid-cols-[72px_1fr_auto] items-center gap-3 rounded-md border border-slate-200 p-3 transition hover:border-slate-400"
                  href={`/productos/${product.slug}`}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="h-full w-full rounded-md object-cover" src={product.imageUrl} alt={product.name} />
                    ) : (
                      <Cpu size={26} aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.sku}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{product.stock} pcs</span>
                </Link>
              ))}
              {featuredProducts.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  <PackageSearch className="mx-auto mb-3" aria-hidden />
                  Run the seed to load initial products.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.category}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-5 transition hover:border-slate-400 hover:shadow-sm"
              href={`/productos?q=${encodeURIComponent(category.category)}`}
            >
              <div>
                <p className="font-semibold text-slate-950">{category.category}</p>
                <p className="mt-1 text-sm text-slate-500">{category._count.category} products available</p>
              </div>
              <ArrowRight size={18} className="text-slate-400" aria-hidden />
            </Link>
          ))}
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

      <section id="manufacturing" className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
              <Factory size={22} aria-hidden />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-slate-950">Manufacturing of Embedded Systems</h2>
          </div>
          <div className="grid gap-4 text-slate-600 md:grid-cols-2">
            <p>
              Nubel Systems is being organized around practical engineering work: component supply through
              Nubel Store and future embedded systems manufacturing services.
            </p>
            <p>
              The catalog is the foundation: stocked parts, clear technical data and a controlled inventory
              flow for projects, repairs and production.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">Need components for a project?</h2>
            <p className="mt-1 text-sm text-slate-300">Browse the catalog and request availability through WhatsApp.</p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            href="/productos"
          >
            Open catalog
          </Link>
        </div>
      </section>
    </main>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2">
      <span className="text-slate-700">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
