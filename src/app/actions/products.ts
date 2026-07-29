"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireStoreAdmin } from "@/lib/admin-auth";
import { createSuggestedProductSku, getProductCategory } from "@/lib/product-catalog";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { parseJsonObject, parseTags, productSchema } from "@/lib/validators";

type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string };

const productImageUploadSchema = z.object({
  mimeType: z.literal("image/webp"),
  sizeBytes: z.number().int().positive().max(2 * 1024 * 1024),
});

const productImagePathsSchema = z.array(z.string().regex(/^products\/[a-z0-9-]+\.webp$/)).max(3);
const productImageIdsSchema = z.array(z.string().min(1)).max(3);

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function productPayload(formData: FormData) {
  const raw = formDataToObject(formData);
  const parsed = productSchema.parse({
    ...raw,
    isActive: formData.get("isActive") === "on",
    isFeatured: formData.get("isFeatured") === "on",
  });
  const category = getProductCategory(parsed.category);
  if (!category) throw new Error("Selecciona una categoría válida del catálogo.");
  if (parsed.subcategory && !category.subcategories.includes(parsed.subcategory as never)) {
    throw new Error("Selecciona una subcategoría válida para la categoría elegida.");
  }

  const { imageUrl: _ignoredImageUrl, ...payload } = parsed;
  void _ignoredImageUrl;
  return {
    ...payload,
    priceSale: new Prisma.Decimal(parsed.priceSale),
    priceCost: parsed.priceCost === undefined ? undefined : new Prisma.Decimal(parsed.priceCost),
    tags: parseTags(parsed.tags),
    technicalAttributes: parseJsonObject(parsed.technicalAttributes),
  };
}

async function resolveGeneratedSku(suggestedSku: string, categoryName: string) {
  const category = getProductCategory(categoryName);
  if (!category) throw new Error("Selecciona una categoría válida del catálogo.");
  const expectedFormat = new RegExp(`^NUB-${category.skuPrefix}-[A-F0-9]{8}$`);
  const candidate = suggestedSku.trim().toUpperCase();
  if (expectedFormat.test(candidate)) {
    const exists = await prisma.product.findUnique({ where: { sku: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const generated = createSuggestedProductSku(category.name);
    const exists = await prisma.product.findUnique({ where: { sku: generated }, select: { id: true } });
    if (!exists) return generated;
  }
  throw new Error("No se pudo generar un SKU único. Inténtalo nuevamente.");
}

function parseImageList(formData: FormData, field: "newImagePaths" | "existingImageIds") {
  const raw = formData.get(field);
  if (!raw || typeof raw !== "string") return [];
  const parsed = JSON.parse(raw);
  return field === "newImagePaths" ? productImagePathsSchema.parse(parsed) : productImageIdsSchema.parse(parsed);
}

async function resolveUploadedProductImages(paths: string[]) {
  if (paths.length === 0) return [];
  const storage = createSupabaseAdminClient().storage.from("product-images");
  const resolved = [] as Array<{ storagePath: string; url: string }>;
  for (const path of paths) {
    const folder = path.slice(0, path.lastIndexOf("/"));
    const filename = path.slice(path.lastIndexOf("/") + 1);
    const { data, error } = await storage.list(folder, { search: filename, limit: 1 });
    if (error || !data?.some((item) => item.name === filename)) throw new Error("Una imagen no terminó de subirse.");
    const { data: publicUrl } = storage.getPublicUrl(path);
    resolved.push({ storagePath: path, url: publicUrl.publicUrl });
  }
  return resolved;
}

async function removeUploadedProductImages(images: Array<{ storagePath: string }>) {
  if (!images.length) return;
  const { error } = await createSupabaseAdminClient().storage.from("product-images").remove(images.map((image) => image.storagePath));
  if (error) console.error("Could not remove unlinked product images", error);
}

function revalidateProducts() {
  updateTag("products");
  revalidatePath("/");
  revalidatePath("/productos");
  revalidatePath("/dashboard/productos");
}

export async function prepareProductImageUpload(rawFile: unknown): Promise<ActionResult<{ path: string; token: string }>> {
  await requireStoreAdmin();
  const file = productImageUploadSchema.safeParse(rawFile);
  if (!file.success) return { ok: false, error: "La imagen final debe ser WebP y pesar como máximo 2 MB." };
  const path = `products/${crypto.randomUUID()}.webp`;
  const { data, error } = await createSupabaseAdminClient().storage.from("product-images").createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: "No se pudo preparar la subida de la imagen." };
  return { ok: true, data: { path, token: data.token } };
}

export async function createProduct(formData: FormData): Promise<ActionResult<{ id: string }>> {
  await requireStoreAdmin();
  let uploadedImages: Array<{ storagePath: string; url: string }> = [];
  try {
    uploadedImages = await resolveUploadedProductImages(parseImageList(formData, "newImagePaths"));
    const payload = productPayload(formData);
    const product = await prisma.product.create({
      data: {
        ...payload,
        sku: await resolveGeneratedSku(payload.sku, payload.category),
        imageUrl: uploadedImages[0]?.url ?? null,
        images: { create: uploadedImages.map((image, position) => ({ ...image, position })) },
      },
    });
    revalidateProducts();
    return { ok: true, data: { id: product.id }, message: "Producto creado." };
  } catch (error) {
    await removeUploadedProductImages(uploadedImages);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo crear el producto." };
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await requireStoreAdmin();
  let newImages: Array<{ storagePath: string; url: string }> = [];
  try {
    const existingIds = parseImageList(formData, "existingImageIds");
    newImages = await resolveUploadedProductImages(parseImageList(formData, "newImagePaths"));
    const currentProduct = await prisma.product.findUnique({ where: { id }, select: { sku: true } });
    if (!currentProduct) return { ok: false, error: "El producto ya no existe." };
    const allExisting = await prisma.productImage.findMany({ where: { productId: id } });
    const existing = allExisting.filter((image) => existingIds.includes(image.id));
    if (existing.length !== existingIds.length) return { ok: false, error: "Una imagen existente ya no pertenece a este producto." };
    const byId = new Map(existing.map((image) => [image.id, image]));
    const orderedExisting = existingIds.map((imageId) => byId.get(imageId)!);
    const images = [...orderedExisting, ...newImages];
    if (images.length > 3) return { ok: false, error: "Cada producto admite como máximo tres imágenes." };
    const product = await prisma.$transaction(async (tx) => {
      await tx.productImage.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
        data: {
          ...productPayload(formData),
          sku: currentProduct.sku,
          imageUrl: images[0]?.url ?? null,
          images: { create: images.map((image, position) => ({ storagePath: image.storagePath, url: image.url, position })) },
        },
      });
    });
    const pathsToRemove = allExisting.filter((image) => !existingIds.includes(image.id)).map((image) => image.storagePath);
    if (pathsToRemove.length) {
      const { error } = await createSupabaseAdminClient().storage.from("product-images").remove(pathsToRemove);
      if (error) console.error("Could not remove replaced product images", error);
    }
    revalidateProducts();
    return { ok: true, data: { id: product.id }, message: "Producto actualizado." };
  } catch (error) {
    await removeUploadedProductImages(newImages);
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo actualizar el producto." };
  }
}

export async function toggleProductActive(id: string, isActive: boolean) {
  await requireStoreAdmin();
  await prisma.product.update({
    where: { id },
    data: { isActive: !isActive },
  });

  revalidateProducts();
}
