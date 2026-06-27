import { PaymentMethod, SaleStatus, StockMovementReason } from "@prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || undefined);
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().min(0).optional(),
);

export const productSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required"),
  name: z.string().trim().min(1, "Name is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  category: z.string().trim().min(1, "Category is required"),
  subcategory: optionalText,
  brand: optionalText,
  shortDescription: optionalText,
  longDescription: optionalText,
  priceSale: z.coerce.number().min(0, "Sale price cannot be negative"),
  priceCost: optionalNumber,
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  minStock: z.coerce.number().int().min(0, "Minimum stock cannot be negative"),
  location: optionalText,
  supplier: optionalText,
  imageUrl: optionalText,
  datasheetUrl: optionalText,
  manualUrl: optionalText,
  externalUrl: optionalText,
  technicalAttributes: optionalText,
  tags: optionalText,
  metaTitle: optionalText,
  metaDescription: optionalText,
  internalNotes: optionalText,
  supplierNotes: optionalText,
  technicalWarnings: optionalText,
  isActive: z.coerce.boolean().default(false),
  isFeatured: z.coerce.boolean().default(false),
});

export const saleSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Add at least one product"),
  customerName: optionalText,
  customerPhone: optionalText,
  customerCity: optionalText,
  notes: optionalText,
  paymentMethod: z.nativeEnum(PaymentMethod),
  saleStatus: z.nativeEnum(SaleStatus),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1),
  newStock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  reason: z.nativeEnum(StockMovementReason),
  notes: z.string().trim().min(1, "Notes are required"),
});

export function parseJsonObject(value?: string) {
  if (!value) return undefined;
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Technical attributes must be a JSON object.");
  }
  return parsed;
}

export function parseTags(value?: string) {
  return value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}
