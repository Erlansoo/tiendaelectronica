import type { Product } from "@prisma/client";

export function formatMoney(value: number | string) {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency: "BOB",
    currencyDisplay: "narrowSymbol",
  }).format(Number(value));
}

export function getStockState(product: Pick<Product, "stock" | "minStock">) {
  if (product.stock <= 0) {
    return "out";
  }

  if (product.stock <= product.minStock) {
    return "low";
  }

  return "ok";
}

export function stockStateLabel(state: ReturnType<typeof getStockState>) {
  if (state === "out") return "Out of stock";
  if (state === "low") return "Low stock";
  return "Available";
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
