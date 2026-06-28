import type { Product } from "@prisma/client";

type WhatsAppProduct = Pick<Product, "name" | "sku"> & {
  priceSale: string | number | { toString(): string };
};

export function buildWhatsAppUrl(product: WhatsAppProduct) {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const message = [
    "Hola, quiero cotizar este producto:",
    `Producto: ${product.name}`,
    `SKU: ${product.sku}`,
    "Cantidad:",
    `Precio unitario: Bs ${Number(product.priceSale).toFixed(2)}`,
    "¿Tiene disponibilidad?",
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
