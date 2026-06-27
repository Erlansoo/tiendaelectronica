import type { Product } from "@prisma/client";
import { clsx } from "clsx";
import { getStockState, stockStateLabel } from "@/lib/format";

export function StockBadge({ product }: { product: Pick<Product, "stock" | "minStock"> }) {
  const state = getStockState(product);

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        state === "ok" && "bg-emerald-100 text-emerald-800",
        state === "low" && "bg-amber-100 text-amber-800",
        state === "out" && "bg-rose-100 text-rose-800",
      )}
    >
      {stockStateLabel(state)}
    </span>
  );
}
