import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function productSearchWhere(query?: string, includeInactive = false): Prisma.ProductWhereInput {
  const trimmed = query?.trim();
  const search = trimmed
    ? {
        OR: [
          { name: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { sku: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { category: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { subcategory: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { brand: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { shortDescription: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { longDescription: { contains: trimmed, mode: Prisma.QueryMode.insensitive } },
          { tags: { has: trimmed.toLowerCase() } },
        ],
      }
    : {};

  return includeInactive ? search : { AND: [{ isActive: true }, search] };
}

export async function getPublicProducts(query?: string) {
  return prisma.product.findMany({
    where: productSearchWhere(query),
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
  });
}

export async function getRelatedProducts(productId: string, category: string) {
  return prisma.product.findMany({
    where: { isActive: true, category, NOT: { id: productId } },
    take: 4,
    orderBy: { createdAt: "desc" },
  });
}
