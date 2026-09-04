import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BatteryCharging,
  Bot,
  Cable,
  ChevronRight,
  CircuitBoard,
  Cpu,
  Factory,
  FileText,
  MessageCircle,
  Monitor,
  PackageCheck,
  Printer,
  Sigma,
  Thermometer,
  Wifi,
  Wrench,
} from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductTile } from "@/components/ProductTile";
import { PublicHeader } from "@/components/PublicHeader";
import { SearchInput } from "@/components/SearchInput";
import { PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { getFeaturedProducts, getPublicCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

const categoryPresentation: Record<string, { en: string; icon: LucideIcon }> = {
  "Placas de inicio": { en: "Starter boards", icon: CircuitBoard },
  "IoT e inalámbricos": { en: "Wireless and IoT", icon: Wifi },
  "Módulos de potencia": { en: "Power modules", icon: BatteryCharging },
  "Componentes pasivos": { en: "Passive components", icon: Sigma },
  Semiconductores: { en: "Semiconductors", icon: Cpu },
  Sensores: { en: "Sensors", icon: Thermometer },
  Pantallas: { en: "Displays", icon: Monitor },
  "Robótica y drivers": { en: "Robotics and drivers", icon: Bot },
  "Prototipado y cables": { en: "Prototyping and cables", icon: Cable },
  "Herramientas y medición": { en: "Tools and measurement", icon: Wrench },
};

function categoryHref(name: string) {
  return `/productos?${new URLSearchParams({ category: name }).toString()}`;
}

function generalWhatsAppUrl() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const message = "Hola, quiero hacer una consulta a Nubel Store.";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export default async function Home() {
  const [featured, categoryCounts] = await Promise.all([getFeaturedProducts(), getPublicCategories()]);
  const countByCategory = new Map(categoryCounts.map((item) => [item.category, item._count.category]));
  const colorByCategory = new Map<string, string>(PRODUCT_CATEGORIES.map((category) => [category.name, category.color]));
  const featuredProducts = featured.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    stock: product.stock,
    minStock: product.minStock,
    priceSale: product.priceSale.toString(),
  }));
  const whatsappUrl = generalWhatsAppUrl();

  return (
    <>
      <PublicHeader />
      <main>
        {/* Category bar: shop-first navigation, swipeable on touch devices. */}
        <nav className="border-b border-neutral-200 bg-white" aria-label="Categorías de productos">
          <div className="scrollbar-none mx-auto flex max-w-7xl snap-x items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:px-8">
            {PRODUCT_CATEGORIES.map((category) => (
              <Link
                key={category.name}
                className="flex min-h-10 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-950"
                href={categoryHref(category.name)}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} aria-hidden />
                <LocalizedText es={category.name} en={categoryPresentation[category.name]?.en ?? category.name} />
              </Link>
            ))}
            <Link
              className="ml-auto flex min-h-10 shrink-0 snap-end items-center gap-1 whitespace-nowrap rounded-full px-3 text-sm font-semibold text-neutral-950 hover:text-[#b16a00]"
              href="/productos"
            >
              <LocalizedText es="Todo el catálogo" en="Full catalog" />
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        </nav>

        {/* Hero: compact, search-first. */}
        <section id="overview" className="bg-[#111111] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 lg:px-8 lg:py-14">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#f5a524]">
                <Cpu size={14} aria-hidden />
                Nubel Systems · Bolivia
              </p>
              <h1 className="mt-4 text-[clamp(1.85rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.1] tracking-tight [text-wrap:balance]">
                <LocalizedText es="Componentes electrónicos con stock real para tu próximo proyecto." en="Electronic components with real stock for your next project." />
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/75 sm:text-lg">
                <LocalizedText
                  es="Placas, sensores, módulos y herramientas para prototipado, reparación y producción. Buscá por nombre, marca o SKU y pedí por WhatsApp."
                  en="Boards, sensors, modules and tools for prototyping, repair and production. Search by name, brand or SKU and order through WhatsApp."
                />
              </p>
              <div className="mt-6 rounded-lg bg-white p-1.5 shadow-xl shadow-black/30">
                <SearchInput placeholder="Buscar producto, marca, categoría o SKU…" />
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f5a524] px-5 text-sm font-semibold text-black transition hover:bg-[#ffb638]"
                  href="/productos"
                >
                  <LocalizedText es="Ver catálogo" en="Browse catalog" />
                  <ArrowRight size={16} aria-hidden />
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-semibold text-white transition hover:border-[#f5a524] hover:text-[#f5a524]"
                  href="/cotizar-impresion-3d"
                >
                  <Printer size={16} aria-hidden />
                  <LocalizedText es="Cotizar impresión 3D" en="Quote 3D printing" />
                </Link>
              </div>
            </div>

            <figure className="relative hidden overflow-hidden rounded-xl border border-white/10 lg:block lg:aspect-[5/4]">
              {/* Optimization of this asset is deferred on purpose; see docs/auditoria-2026-09-04.html (A4). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="h-full w-full object-cover" src="/mujer_vendiendo.png" alt="Atención a un cliente en Nubel Store" />
              <figcaption className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/85 to-black/0 px-5 pb-4 pt-12 text-sm">
                <span className="font-medium text-white">
                  <LocalizedText es="Atención personalizada y stock visible" en="Personal support and visible stock" />
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#f5a524]">Bs · BOB</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-neutral-200 bg-white">
          <ul className="mx-auto grid max-w-7xl grid-cols-2 divide-neutral-200 px-4 sm:px-6 lg:grid-cols-4 lg:divide-x lg:px-8">
            <TrustItem icon={PackageCheck} es="Stock visible en cada producto" en="Live stock on every product" />
            <TrustItem icon={FileText} es="Atributos técnicos y hojas de datos" en="Technical attributes and datasheets" />
            <TrustItem icon={MessageCircle} es="Pedidos y consultas por WhatsApp" en="Orders and questions via WhatsApp" />
            <TrustItem icon={Printer} es="Impresión 3D bajo pedido" en="3D printing on demand" />
          </ul>
        </section>

        {/* Categories */}
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <SectionHeading
            eyebrowEs="Catálogo"
            eyebrowEn="Catalog"
            titleEs="Comprar por categoría"
            titleEn="Shop by category"
            href="/productos"
            linkEs="Ver todo"
            linkEn="View all"
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {PRODUCT_CATEGORIES.map((category) => {
              const presentation = categoryPresentation[category.name];
              const Icon = presentation?.icon ?? Cpu;
              const count = countByCategory.get(category.name) ?? 0;
              return (
                <Link
                  key={category.name}
                  className="group flex min-h-[132px] flex-col justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  href={categoryHref(category.name)}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${category.color}1a`, color: category.color }}
                    >
                      <Icon size={18} aria-hidden />
                    </span>
                    {count > 0 ? <span className="font-mono text-[11px] tabular-nums text-neutral-500">{count}</span> : null}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold leading-snug text-neutral-950 group-hover:text-[#b16a00]">
                      <LocalizedText es={category.name} en={presentation?.en ?? category.name} />
                    </span>
                    <span className="mt-1 line-clamp-2 block text-xs leading-5 text-neutral-500">
                      {category.subcategories.slice(0, 3).join(" · ")}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Featured products */}
        <section id="featured" className="scroll-mt-24 border-t border-neutral-200 bg-neutral-100/70">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <SectionHeading
              eyebrowEs="Inventario"
              eyebrowEn="Inventory"
              titleEs="Destacados en stock"
              titleEn="Featured in stock"
              href="/productos"
              linkEs="Todo el catálogo"
              linkEn="Full catalog"
            />
            {featuredProducts.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductTile key={product.id} product={product} accentColor={colorByCategory.get(product.category)} />
                ))}
              </div>
            ) : (
              <p className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-sm text-neutral-600">
                <LocalizedText es="Todavía no hay productos destacados. Explorá el catálogo completo." en="No featured products yet. Browse the full catalog." />
              </p>
            )}
          </div>
        </section>

        {/* Manufacturing services */}
        <section id="manufacturing" className="scroll-mt-24 bg-[#111111] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f5a524]">
              <LocalizedText es="Servicios" en="Services" />
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              <LocalizedText es="Más allá del componente" en="Beyond the component" />
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <ServiceCard
                icon={Printer}
                titleEs="Impresión 3D bajo pedido"
                titleEn="3D printing on demand"
                bodyEs="Subí tu modelo STL, elegí tecnología y material, y recibí una estimación de manufactureros verificados en Bolivia."
                bodyEn="Upload your STL, pick technology and material, and get an estimate from verified manufacturers in Bolivia."
                href="/cotizar-impresion-3d"
                ctaEs="Cotizar ahora"
                ctaEn="Get a quote"
              />
              <ServiceCard
                icon={Factory}
                titleEs="Manufactura de sistemas embebidos"
                titleEn="Embedded systems manufacturing"
                bodyEs="Diseño, prototipado y ensamblaje de electrónica a medida para proyectos y pequeñas series. Contanos qué necesitás."
                bodyEn="Design, prototyping and assembly of custom electronics for projects and small batches. Tell us what you need."
                href={whatsappUrl}
                external
                ctaEs="Consultar por WhatsApp"
                ctaEn="Ask on WhatsApp"
              />
            </div>
          </div>
        </section>

        {/* Contact + footer */}
        <footer id="contact" className="scroll-mt-24 border-t border-neutral-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
            <div className="max-w-sm">
              <p className="font-mono text-[15px] font-black uppercase tracking-[0.08em] text-neutral-950">
                Nubel <span className="text-[#b16a00]">Store</span>
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                <LocalizedText
                  es="Tienda de componentes electrónicos de Nubel Systems. Stock actualizado, datos técnicos claros y atención directa por WhatsApp."
                  en="Nubel Systems electronics components store. Up-to-date stock, clear technical data and direct support via WhatsApp."
                />
              </p>
              <a
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-[#f5a524] hover:text-black"
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={16} aria-hidden />
                <LocalizedText es="Escribinos por WhatsApp" en="Message us on WhatsApp" />
              </a>
            </div>
            <FooterColumn
              titleEs="Tienda"
              titleEn="Store"
              links={[
                { href: "/productos", es: "Catálogo", en: "Catalog" },
                { href: "/cotizar-impresion-3d", es: "Cotizar impresión 3D", en: "Quote 3D printing" },
                { href: "/crear-cuenta", es: "Crear cuenta", en: "Create account" },
                { href: "/login", es: "Ingresar", en: "Login" },
              ]}
            />
            <FooterColumn
              titleEs="Ayuda"
              titleEn="Help"
              links={[
                { href: whatsappUrl, es: "Consultas por WhatsApp", en: "WhatsApp support", external: true },
                { href: "/politica-de-cookies", es: "Política de cookies", en: "Cookie policy" },
                { href: "/dashboard/login", es: "Acceso del personal", en: "Staff access" },
              ]}
            />
          </div>
          <div className="border-t border-neutral-200">
            <p className="mx-auto max-w-7xl px-4 pb-16 pt-4 text-xs text-neutral-500 sm:px-6 sm:pb-4 sm:pl-52 lg:px-8 lg:pl-52">
              © {new Date().getFullYear()} Nubel Systems · Bolivia · <LocalizedText es="Precios en bolivianos (Bs)." en="Prices in bolivianos (Bs)." />
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}

function TrustItem({ icon: Icon, es, en }: { icon: LucideIcon; es: string; en: string }) {
  return (
    <li className="flex items-center gap-3 py-3 pr-3 text-sm text-neutral-800 lg:justify-center lg:py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#fff3dc] text-[#b16a00]">
        <Icon size={16} aria-hidden />
      </span>
      <span className="font-medium leading-tight">
        <LocalizedText es={es} en={en} />
      </span>
    </li>
  );
}

function SectionHeading({
  eyebrowEs,
  eyebrowEn,
  titleEs,
  titleEn,
  href,
  linkEs,
  linkEn,
}: {
  eyebrowEs: string;
  eyebrowEn: string;
  titleEs: string;
  titleEn: string;
  href: string;
  linkEs: string;
  linkEn: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b16a00]">
          <LocalizedText es={eyebrowEs} en={eyebrowEn} />
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-950 sm:text-3xl">
          <LocalizedText es={titleEs} en={titleEn} />
        </h2>
      </div>
      <Link className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-neutral-800 hover:text-[#b16a00]" href={href}>
        <LocalizedText es={linkEs} en={linkEn} />
        <ArrowRight size={16} aria-hidden />
      </Link>
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  titleEs,
  titleEn,
  bodyEs,
  bodyEn,
  href,
  external,
  ctaEs,
  ctaEn,
}: {
  icon: LucideIcon;
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  href: string;
  external?: boolean;
  ctaEs: string;
  ctaEn: string;
}) {
  const linkClass =
    "mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black";
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#f5a524] text-black">
        <Icon size={20} aria-hidden />
      </span>
      <h3 className="text-xl font-semibold">
        <LocalizedText es={titleEs} en={titleEn} />
      </h3>
      <p className="text-sm leading-6 text-white/70">
        <LocalizedText es={bodyEs} en={bodyEn} />
      </p>
      {external ? (
        <a className={linkClass} href={href} target="_blank" rel="noreferrer">
          <LocalizedText es={ctaEs} en={ctaEn} />
          <ArrowRight size={16} aria-hidden />
        </a>
      ) : (
        <Link className={linkClass} href={href}>
          <LocalizedText es={ctaEs} en={ctaEn} />
          <ArrowRight size={16} aria-hidden />
        </Link>
      )}
    </article>
  );
}

function FooterColumn({
  titleEs,
  titleEn,
  links,
}: {
  titleEs: string;
  titleEn: string;
  links: Array<{ href: string; es: string; en: string; external?: boolean }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">
        <LocalizedText es={titleEs} en={titleEn} />
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {links.map((link) => (
          <li key={link.href + link.es}>
            {link.external ? (
              <a className="inline-flex min-h-9 items-center text-sm text-neutral-800 hover:text-[#b16a00]" href={link.href} target="_blank" rel="noreferrer">
                <LocalizedText es={link.es} en={link.en} />
              </a>
            ) : (
              <Link className="inline-flex min-h-9 items-center text-sm text-neutral-800 hover:text-[#b16a00]" href={link.href}>
                <LocalizedText es={link.es} en={link.en} />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
