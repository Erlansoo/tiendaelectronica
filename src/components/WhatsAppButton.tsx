import type { Product } from "@prisma/client";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export function WhatsAppButton({
  product,
  className = "",
}: {
  product: Pick<Product, "name" | "sku" | "priceSale">;
  className?: string;
}) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 ${className}`}
      href={buildWhatsAppUrl(product)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={16} aria-hidden />
      Order by WhatsApp
    </a>
  );
}
