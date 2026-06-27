import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
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

export const getFeaturedProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ["featured-products"],
  { revalidate: 300, tags: ["products"] },
);

export const getPublicCategories = unstable_cache(
  async () =>
    prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { category: true },
      orderBy: { category: "asc" },
    }),
  ["public-categories"],
  { revalidate: 300, tags: ["products"] },
);

const getCachedProductBySlug = unstable_cache(
  async (slug: string) =>
    prisma.product.findFirst({
      where: { slug, isActive: true },
    }),
  ["product-by-slug"],
  { revalidate: 300, tags: ["products"] },
);

const getCachedRelatedProducts = unstable_cache(
  async (productId: string, category: string) =>
    prisma.product.findMany({
      where: { isActive: true, category, NOT: { id: productId } },
      take: 4,
      orderBy: { createdAt: "desc" },
    }),
  ["related-products"],
  { revalidate: 300, tags: ["products"] },
);

export async function getProductBySlug(slug: string) {
  if (!slug || slug.length > 120) return null;
  return getCachedProductBySlug(slug);
}

export async function getRelatedProducts(productId: string, category: string) {
  return getCachedRelatedProducts(productId, category);
}
