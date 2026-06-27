import Link from "next/link";
import { ArrowRight, Cpu, Factory, PackageCheck, PackageSearch, RadioTower, ShieldCheck } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { PublicHeader } from "@/components/PublicHeader";
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
      <PublicHeader />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 overflow-x-auto px-6 py-3 text-sm font-semibold text-neutral-700 lg:px-8">
          <a className="rounded-md bg-neutral-100 px-4 py-2 text-black" href="#overview">
            Overview
          </a>
          <a className="whitespace-nowrap transition hover:text-[#f5a524]" href="#featured">
            Featured products
          </a>
          <a className="whitespace-nowrap transition hover:text-[#f5a524]" href="#manufacturing">
            Manufacturing
          </a>
          <a className="whitespace-nowrap transition hover:text-[#f5a524]" href="#contact">
            Contact
          </a>
        </div>
      </section>

      <section
        id="overview"
        className="relative min-h-[620px] overflow-hidden bg-black text-white"
      >
        <div className="absolute inset-0 opacity-45">
          <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_22%_18%,rgba(245,165,36,0.32),transparent_28%),linear-gradient(90deg,rgba(0,0,0,0.25),rgba(0,0,0,0.94))]" />
          <div className="absolute left-[8%] top-[16%] h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute bottom-[8%] left-[5%] grid grid-cols-6 gap-2 opacity-70">
            {Array.from({ length: 36 }).map((_, index) => (
              <span key={index} className="h-2 w-2 rounded-full bg-white/25" />
            ))}
          </div>
          <div className="absolute right-[8%] top-[18%] h-[420px] w-[420px] rotate-6 rounded-md border border-white/10 bg-white/5" />
          {featuredProducts[0]?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="absolute right-[12%] top-[22%] h-72 w-72 rotate-6 rounded-2xl object-contain opacity-85 blur-[0.2px]"
              src={featuredProducts[0].imageUrl}
              alt=""
            />
          ) : null}
          {featuredProducts[1]?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="absolute bottom-[12%] right-[28%] h-44 w-44 -rotate-12 rounded-2xl object-contain opacity-75"
              src={featuredProducts[1].imageUrl}
              alt=""
            />
          ) : null}
        </div>

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col items-center justify-center px-6 py-20 text-center lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <Cpu size={16} aria-hidden />
            Nubel Systems Store
          </div>
          <h1 className="mt-7 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Electronic components for real embedded systems.
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82">
            Search stocked parts, technical modules and components for repair, prototyping and manufacturing work in Bolivia.
          </p>
          <div className="mt-9 w-full max-w-3xl rounded-md bg-white p-2 shadow-2xl shadow-black/30">
            <SearchInput placeholder="Search MOSFET, HC-12, Arduino, STM32, SKU..." />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#f5a524]"
              href="/productos"
            >
              Browse catalog
              <ArrowRight size={16} aria-hidden />
            </Link>
            <a
              className="inline-flex items-center rounded-md border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black"
              href="#manufacturing"
            >
              Manufacturing
            </a>
          </div>
          <div className="mt-10 grid w-full max-w-3xl gap-3 text-sm text-white sm:grid-cols-3">
            <TrustItem icon={<PackageCheck size={18} />} label="Visible stock" />
            <TrustItem icon={<ShieldCheck size={18} />} label="Technical details" />
            <TrustItem icon={<RadioTower size={18} />} label="WhatsApp ordering" />
          </div>
        </div>
      </section>

      <section id="featured" className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Featured inventory</h2>
            <p className="mt-1 text-sm text-slate-600">Products ready for technical projects.</p>
          </div>
          <Link className="text-sm font-semibold text-black hover:text-[#f5a524]" href="/productos">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-200 bg-neutral-50">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.category}
                className="flex items-center justify-between rounded-md border border-neutral-200 bg-white p-5 transition hover:border-[#f5a524] hover:shadow-sm"
                href={`/productos?q=${encodeURIComponent(category.category)}`}
              >
                <div>
                  <p className="font-semibold text-black">{category.category}</p>
                  <p className="mt-1 text-sm text-neutral-500">{category._count.category} products available</p>
                </div>
                <ArrowRight size={18} className="text-neutral-400" aria-hidden />
              </Link>
            ))}
            {categories.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500 md:col-span-3">
                <PackageSearch className="mx-auto mb-3" aria-hidden />
                Run the seed to load initial products.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section id="manufacturing" className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-black text-white">
              <Factory size={22} aria-hidden />
            </div>
            <h2 className="mt-5 text-3xl font-semibold text-black">Manufacturing of Embedded Systems</h2>
          </div>
          <div className="grid gap-4 text-neutral-600 md:grid-cols-2">
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

      <section id="contact" className="border-t border-slate-200 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">Need components for a project?</h2>
            <p className="mt-1 text-sm text-slate-300">Browse the catalog and request availability through WhatsApp.</p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#f5a524]"
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
    <div className="flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
      <span className="text-[#f5a524]">{icon}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}
