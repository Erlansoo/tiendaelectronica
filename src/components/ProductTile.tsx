import type { CSSProperties } from "react";
import Link from "next/link";
import { Cpu, MessageCircle } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import type { ProductCardProduct } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { formatMoney } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/**
 * Compact product tile for dense grids (landing page, related products).
 * The full ProductCard stays in use for the catalog listing.
 */
export function ProductTile({
  product,
  accentColor = "#64748b",
}: {
  product: ProductCardProduct;
  accentColor?: string;
}) {
  const href = `/productos/${product.slug}`;

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
      style={{ "--tile-accent": accentColor } as CSSProperties}
    >
      <Link className="relative block aspect-[4/3] overflow-hidden bg-neutral-100" href={href} tabIndex={-1} aria-hidden>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={product.imageUrl} alt="" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-neutral-400">
            <Cpu size={40} aria-hidden />
          </span>
        )}
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: accentColor }} />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: accentColor }}>
            {product.category}
          </span>
          <StockBadge product={product} />
        </div>

        <h3 className="text-sm font-semibold leading-snug text-neutral-950 sm:text-base">
          <Link className="line-clamp-2 outline-none after:absolute after:inset-0 focus-visible:underline" href={href}>
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="text-lg font-semibold tabular-nums text-neutral-950">{formatMoney(product.priceSale.toString())}</span>
          <span className="truncate font-mono text-[11px] text-neutral-500">{product.sku}</span>
        </div>

        <div className="relative z-10 mt-1 grid grid-cols-[1fr_auto] gap-2">
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-900 transition hover:border-[#f5a524] hover:bg-[#f5a524]"
            href={href}
          >
            <LocalizedText es="Ver detalle" en="View detail" />
          </Link>
          <a
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md bg-neutral-950 px-3 text-white transition hover:bg-[#f5a524] hover:text-black"
            href={buildWhatsAppUrl(product)}
            target="_blank"
            rel="noreferrer"
            aria-label={`Pedir ${product.name} por WhatsApp`}
            title="Pedir por WhatsApp"
          >
            <MessageCircle size={18} aria-hidden />
          </a>
        </div>
      </div>
    </article>
  );
}
