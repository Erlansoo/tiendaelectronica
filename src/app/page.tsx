import Link from "next/link";
import { ArrowRight, Cpu, Factory, PackageCheck, PackageSearch, RadioTower, ShieldCheck } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { LocalizedText } from "@/components/LocalizedText";
import { PublicHeader } from "@/components/PublicHeader";
import { SearchInput } from "@/components/SearchInput";
import { getFeaturedProducts, getPublicCategories } from "@/lib/products";

export const dynamic = "force-dynamic";

const recommendedCategoryNavigation = [
  {
    label: "Placas de inicio",
    labelEn: "Starter boards",
    query: "Arduino",
    description: "Arduino, STM32 y placas para empezar",
    descriptionEn: "Arduino, STM32 and first dev boards",
  },
  {
    label: "IoT e inalámbricos",
    labelEn: "Wireless and IoT",
    query: "ESP32",
    description: "ESP32, ESP8266 y módulos de radio",
    descriptionEn: "ESP32, ESP8266 and radio modules",
  },
  {
    label: "Módulos de potencia",
    labelEn: "Power modules",
    query: "LM2596 XL4015 MT3608",
    description: "Step-down, step-up y energía con baterías",
    descriptionEn: "Step-down, step-up and battery power",
  },
  {
    label: "Componentes pasivos",
    labelEn: "Passive components",
    query: "resistor capacitor",
    description: "Resistencias, capacitores y potenciómetros",
    descriptionEn: "Resistors, capacitors and potentiometers",
  },
  {
    label: "Semiconductores",
    labelEn: "Semiconductors",
    query: "MOSFET diode transistor regulator",
    description: "Diodos, transistores, MOSFETs y reguladores",
    descriptionEn: "Diodes, transistors, MOSFETs and regulators",
  },
  {
    label: "Sensores",
    labelEn: "Sensors",
    query: "sensor",
    description: "Distancia, temperatura, movimiento y RFID",
    descriptionEn: "Distance, temperature, motion and RFID",
  },
  {
    label: "Pantallas",
    labelEn: "Displays",
    query: "OLED LCD display",
    description: "OLED, LCD y pantallas de interfaz",
    descriptionEn: "OLED, LCD and interface screens",
  },
  {
    label: "Robótica y drivers",
    labelEn: "Robotics and drivers",
    query: "motor driver servo",
    description: "Motores, drivers y módulos de robótica",
    descriptionEn: "Motors, drivers and robotics modules",
  },
  {
    label: "Prototipado y cables",
    labelEn: "Prototyping and cables",
    query: "jumper protoboard cable",
    description: "Protoboards, jumpers y conectores",
    descriptionEn: "Breadboards, jumpers and connectors",
  },
];

export default async function Home() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getPublicCategories(),
  ]);

  return (
    <main>
      <PublicHeader />

      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-8 overflow-x-auto px-6 py-3 text-sm font-semibold text-neutral-700 lg:px-8">
          <a className="rounded-full bg-neutral-100 px-4 py-2 text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:shadow-md hover:shadow-[#f5a524]/20" href="#overview">
            <LocalizedText es="Resumen" en="Overview" />
          </a>
          <a className="whitespace-nowrap rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-md hover:shadow-[#f5a524]/20" href="#featured">
            <LocalizedText es="Inventario destacado" en="Featured products" />
          </a>
          <a className="whitespace-nowrap rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-md hover:shadow-[#f5a524]/20" href="#manufacturing">
            <LocalizedText es="Sistemas embebidos" en="Embedded systems" />
          </a>
          <a className="whitespace-nowrap rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-md hover:shadow-[#f5a524]/20" href="#contact">
            <LocalizedText es="Contacto" en="Contact" />
          </a>
        </div>
      </section>

      <section
        id="overview"
        className="relative min-h-[620px] overflow-hidden bg-black text-white"
      >
        <div className="absolute inset-0">
          <div className="hero-trust-image hero-trust-image-one" />
          <div className="hero-trust-image hero-trust-image-two" />
          <div className="hero-trust-image hero-trust-image-three" />
          <div className="hero-trust-image hero-trust-image-four" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.84),rgba(0,0,0,0.62)_46%,rgba(0,0,0,0.88)),radial-gradient(circle_at_50%_30%,rgba(245,165,36,0.22),transparent_34%)]" />
        </div>
        <div className="absolute inset-0 opacity-35">
          <div className="absolute left-[8%] top-[16%] h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute bottom-[8%] left-[5%] grid grid-cols-6 gap-2 opacity-70">
            {Array.from({ length: 36 }).map((_, index) => (
              <span key={index} className="h-2 w-2 rounded-full bg-white/25" />
            ))}
          </div>
          <div className="absolute right-[8%] top-[18%] h-[420px] w-[420px] rotate-6 rounded-md border border-white/10 bg-white/5" />
        </div>

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col items-center justify-center px-6 py-20 text-center lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
            <Cpu size={16} aria-hidden />
            Nubel Systems Store
          </div>
          <h1 className="mt-7 max-w-5xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            <LocalizedText es="Componentes electrónicos para sistemas embebidos reales." en="Electronic components for real embedded systems." />
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-white/82">
            <LocalizedText es="Buscá piezas en stock, módulos técnicos y componentes para reparación, prototipado y manufactura en Bolivia." en="Search stocked parts, technical modules and components for repair, prototyping and manufacturing work in Bolivia." />
          </p>
          <div className="mt-9 w-full max-w-3xl rounded-md bg-white p-2 shadow-2xl shadow-black/30">
            <SearchInput placeholder="Buscar MOSFET, HC-12, Arduino, STM32, SKU..." />
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:shadow-xl hover:shadow-[#f5a524]/20"
              href="/productos"
            >
              <LocalizedText es="Ver catálogo" en="Browse catalog" />
              <ArrowRight size={16} aria-hidden />
            </Link>
            <a
              className="inline-flex items-center rounded-full border border-white/70 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-xl hover:shadow-[#f5a524]/20"
              href="/cotizar-impresion-3d"
            >
              Ordenar impresión 3D
            </a>
          </div>
          <div className="mt-10 grid w-full max-w-3xl gap-3 text-sm text-white sm:grid-cols-3">
            <TrustItem icon={<PackageCheck size={18} />} label="Stock visible" labelEn="Visible stock" />
            <TrustItem icon={<ShieldCheck size={18} />} label="Detalles técnicos" labelEn="Technical details" />
            <TrustItem icon={<RadioTower size={18} />} label="Pedidos por WhatsApp" labelEn="WhatsApp ordering" />
          </div>
        </div>
      </section>

      <section id="featured" className="scroll-mt-40 mx-auto max-w-[1680px] px-5 py-12 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="border-l-4 border-[#f5a524] bg-white pl-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#b16a00]">
                <LocalizedText es="Estructura de compra" en="Browse structure" />
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                <LocalizedText es="Categorías de inventario" en="Inventory categories" />
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <LocalizedText es="Organizadas desde la lista recomendada de compra para electrónica, prototipado y sistemas embebidos." en="Organized from the recommended purchasing list for electronics, prototyping and embedded systems." />
              </p>
            </div>

            <nav className="mt-5 grid gap-2" aria-label="Recommended inventory categories">
              {recommendedCategoryNavigation.map((category) => (
                <Link
                  key={category.label}
                  className="group rounded-md border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-[#f5a524] hover:shadow-sm"
                  href={`/productos?q=${encodeURIComponent(category.query)}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-slate-950">
                      <LocalizedText es={category.label} en={category.labelEn} />
                    </span>
                    <ArrowRight
                      size={16}
                      className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#f5a524]"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    <LocalizedText es={category.description} en={category.descriptionEn} />
                  </span>
                </Link>
              ))}
            </nav>
          </aside>

          <div>
            <div className="mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">
                  <LocalizedText es="Inventario destacado" en="Featured inventory" />
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  <LocalizedText es="Productos listos para proyectos técnicos." en="Products ready for technical projects." />
                </p>
              </div>
            </div>
            <div className="grid justify-start gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,225px),255px))] 2xl:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
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
                  <p className="mt-1 text-sm text-neutral-500">
                    {category._count.category} <LocalizedText es="productos disponibles" en="products available" />
                  </p>
                </div>
                <ArrowRight size={18} className="text-neutral-400" aria-hidden />
              </Link>
            ))}
            {categories.length === 0 ? (
              <div className="rounded-md border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500 md:col-span-3">
                <PackageSearch className="mx-auto mb-3" aria-hidden />
                <LocalizedText es="Ejecutá el seed para cargar los productos iniciales." en="Run the seed to load initial products." />
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
            <h2 className="mt-5 text-3xl font-semibold text-black">
              <LocalizedText es="Manufactura de sistemas embebidos" en="Manufacturing of Embedded Systems" />
            </h2>
          </div>
          <div className="grid gap-4 text-neutral-600 md:grid-cols-2">
            <p>
              <LocalizedText es="Nubel Systems se organiza alrededor de ingeniería práctica: suministro de componentes mediante Nubel Store y futuros servicios de manufactura de sistemas embebidos." en="Nubel Systems is being organized around practical engineering work: component supply through Nubel Store and future embedded systems manufacturing services." />
            </p>
            <p>
              <LocalizedText es="El catálogo es la base: piezas con stock, datos técnicos claros y un flujo controlado de inventario para proyectos, reparaciones y producción." en="The catalog is the foundation: stocked parts, clear technical data and a controlled inventory flow for projects, repairs and production." />
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-slate-200 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <h2 className="text-xl font-semibold">
              <LocalizedText es="¿Necesitás componentes para un proyecto?" en="Need components for a project?" />
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              <LocalizedText es="Revisá el catálogo y pedí disponibilidad por WhatsApp." en="Browse the catalog and request availability through WhatsApp." />
            </p>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:shadow-xl hover:shadow-[#f5a524]/20"
            href="/productos"
          >
            <LocalizedText es="Abrir catálogo" en="Open catalog" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function TrustItem({ icon, label, labelEn }: { icon: React.ReactNode; label: string; labelEn: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
      <span className="text-[#f5a524]">{icon}</span>
      <span className="font-medium">
        <LocalizedText es={label} en={labelEn} />
      </span>
    </div>
  );
}
