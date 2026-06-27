import Link from "next/link";
import { notFound } from "next/navigation";
import { Cpu } from "lucide-react";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatMoney } from "@/lib/format";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.category);
  const attributes =
    product.technicalAttributes && typeof product.technicalAttributes === "object"
      ? Object.entries(product.technicalAttributes as Record<string, unknown>)
      : [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
      <Link className="text-sm font-semibold text-slate-600 hover:text-slate-950" href="/productos">
        Back to products
      </Link>
      <section className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex aspect-square items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="h-full w-full rounded-md object-cover" src={product.imageUrl} alt={product.name} />
          ) : (
            <Cpu size={72} aria-hidden />
          )}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {product.category}
            </span>
            {product.subcategory ? <span className="text-sm text-slate-500">{product.subcategory}</span> : null}
            <StockBadge product={product} />
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{product.name}</h1>
          <p className="mt-4 text-lg text-slate-600">{product.shortDescription}</p>
          <div className="mt-6 flex flex-wrap items-center gap-5">
            <span className="text-3xl font-semibold text-slate-950">{formatMoney(product.priceSale.toString())}</span>
            <span className="text-sm text-slate-600">Stock: {product.stock}</span>
            <span className="font-mono text-sm text-slate-500">SKU: {product.sku}</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <WhatsAppButton product={product} />
            {product.datasheetUrl ? (
              <a className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100" href={product.datasheetUrl}>
                Datasheet
              </a>
            ) : null}
          </div>
          {product.longDescription ? <p className="mt-8 leading-7 text-slate-700">{product.longDescription}</p> : null}
        </div>
      </section>

      {attributes.length > 0 ? (
        <section className="mt-10 rounded-md border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Technical attributes</h2>
          <dl className="mt-4 grid gap-3 md:grid-cols-2">
            {attributes.map(([key, value]) => (
              <div key={key} className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</dt>
                <dd className="mt-1 text-sm text-slate-800">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-slate-950">Related products</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
