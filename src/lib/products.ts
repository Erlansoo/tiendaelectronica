import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PUBLIC_PRODUCTS_PAGE_SIZE = 24;
const MAX_PRODUCT_SEARCH_LENGTH = 100;

export function normalizeProductSearchQuery(query?: string) {
  return query?.trim().slice(0, MAX_PRODUCT_SEARCH_LENGTH) ?? "";
}

export function productSearchWhere(query?: string, includeInactive = false, category?: string): Prisma.ProductWhereInput {
  const trimmed = normalizeProductSearchQuery(query);
  const filters: Prisma.ProductWhereInput[] = [];
  if (!includeInactive) filters.push({ isActive: true });
  if (category) filters.push({ category });
  if (trimmed) filters.push({
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
  });
  return filters.length ? { AND: filters } : {};
}

export async function getPublicProducts(query?: string, requestedPage?: number, category?: string) {
  const normalizedQuery = normalizeProductSearchQuery(query);
  const where = productSearchWhere(normalizedQuery, false, category);
  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PRODUCTS_PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage ?? 1, 1), totalPages);
  const products = await prisma.product.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PUBLIC_PRODUCTS_PAGE_SIZE,
    take: PUBLIC_PRODUCTS_PAGE_SIZE,
  });

  return { products, page, totalPages, query: normalizedQuery, category: category ?? "" };
}

export const getFeaturedProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      take: 8,
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
      include: { images: { orderBy: { position: "asc" } } },
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
