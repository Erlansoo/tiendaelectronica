import type { Product } from "@prisma/client";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Cpu } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { LocalizedText } from "@/components/LocalizedText";
import { StockBadge } from "@/components/StockBadge";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export type ProductCardProduct = Pick<
  Product,
  "name" | "sku" | "slug" | "category" | "shortDescription" | "imageUrl" | "stock" | "minStock"
> & {
  priceSale: string | number | { toString(): string };
};

export function ProductCard({
  product,
  accentColor,
}: {
  product: ProductCardProduct;
  accentColor?: string;
}) {
  return (
    <article
      className="flex h-full flex-col rounded-md border border-t-4 border-slate-200 bg-white p-4 shadow-sm"
      style={{ borderTopColor: accentColor ?? "#e2e8f0" } as CSSProperties}
    >
      <div className="flex aspect-[4/3] shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full rounded-md object-cover" src={product.imageUrl} alt={product.name} />
        ) : (
          <Cpu size={44} aria-hidden />
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <div className="grid min-h-[78px] grid-cols-[1fr_auto] items-start gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug text-slate-950">{product.name}</h2>
          </div>
          <StockBadge product={product} />
        </div>
        <p className="mt-3 min-h-[60px] text-sm text-slate-600">
          {product.shortDescription ?? <LocalizedText es="Componente electrónico." en="Electronic component." />}
        </p>
        <div className="mt-auto flex min-h-[32px] items-center justify-between gap-3 pt-4">
          <span className="text-xl font-semibold text-slate-950">{formatMoney(product.priceSale.toString())}</span>
          <span className="text-sm text-slate-600">Stock: {product.stock}</span>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            className="inline-flex items-center justify-center rounded-md border border-black px-4 py-2 text-sm font-semibold text-black transition hover:border-[#f5a524] hover:bg-[#f5a524]"
            href={`/productos/${product.slug}`}
          >
            <LocalizedText es="Ver detalle" en="View detail" />
          </Link>
          <WhatsAppButton product={product} />
        </div>
      </div>
    </article>
  );
}
