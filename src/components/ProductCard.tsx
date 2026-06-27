import type { Product } from "@prisma/client";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { StockBadge } from "@/components/StockBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="flex h-full flex-col rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-100 text-slate-500">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full rounded-md object-cover" src={product.imageUrl} alt={product.name} />
        ) : (
          <Cpu size={44} aria-hidden />
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{product.category}</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-950">{product.name}</h2>
          </div>
          <StockBadge product={product} />
        </div>
        <p className="mt-3 text-sm text-slate-600">{product.shortDescription ?? "Electronic component."}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-semibold text-slate-950">{formatMoney(product.priceSale.toString())}</span>
          <span className="text-sm text-slate-600">Stock: {product.stock}</span>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            href={`/productos/${product.slug}`}
          >
            View detail
          </Link>
          <WhatsAppButton product={product} />
        </div>
      </div>
    </article>
  );
}
