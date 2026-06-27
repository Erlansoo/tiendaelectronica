import { Product } from "@prisma/client";

export function buildWhatsAppUrl(product: Pick<Product, "name" | "sku" | "priceSale">) {
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
