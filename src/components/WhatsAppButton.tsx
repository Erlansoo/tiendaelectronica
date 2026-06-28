import type { Product } from "@prisma/client";
import { MessageCircle } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
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
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f5a524] hover:text-black ${className}`}
      href={buildWhatsAppUrl(product)}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={16} aria-hidden />
      <LocalizedText es="Pedir por WhatsApp" en="Order by WhatsApp" />
    </a>
  );
}
