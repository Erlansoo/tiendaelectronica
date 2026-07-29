"use client";

import type { Product, ProductImage } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProduct, prepareProductImageUpload, updateProduct } from "@/app/actions/products";
import { ProductImageManager, type NewProductImage } from "@/components/ProductImageManager";

type ProductWithImages = Product & { images: ProductImage[] };

function fieldValue(value?: string | number | null) { return value ?? ""; }

export function ProductForm({ product }: { product?: ProductWithImages }) {
  const router = useRouter();
  const [imageState, setImageState] = useState<{ existingIds: string[]; newImages: NewProductImage[] }>({ existingIds: product?.images.map((image) => image.id) ?? [], newImages: [] });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const technicalAttributes = product?.technicalAttributes ? JSON.stringify(product.technicalAttributes, null, 2) : "";

  async function uploadImages(images: NewProductImage[]) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Storage no está configurado.");
    const supabase = createClient(url, key);
    const paths: string[] = [];
    for (const image of images) {
      const prepared = await prepareProductImageUpload({ mimeType: "image/webp", sizeBytes: image.blob.size });
      if (!prepared.ok) throw new Error(prepared.error);
      const { error } = await supabase.storage.from("product-images").uploadToSignedUrl(prepared.data.path, prepared.data.token, image.blob, { contentType: "image/webp" });
      if (error) throw new Error("No se pudo subir una imagen procesada.");
      paths.push(prepared.data.path);
    }
    return paths;
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        setMessage(null);
        const paths = await uploadImages(imageState.newImages);
        formData.set("existingImageIds", JSON.stringify(imageState.existingIds));
        formData.set("newImagePaths", JSON.stringify(paths));
        const result = product ? await updateProduct(product.id, formData) : await createProduct(formData);
        if (!result.ok) return setMessage(result.error);
        router.push(product ? `/dashboard/productos/${product.id}/editar` : "/dashboard/productos");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo guardar el producto.");
      }
    });
  }

  return <form action={submit} className="space-y-6">
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Datos básicos</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <Input name="name" label="Nombre" defaultValue={fieldValue(product?.name)} required /><Input name="sku" label="SKU" defaultValue={fieldValue(product?.sku)} required />
      <Input name="slug" label="Slug" defaultValue={fieldValue(product?.slug)} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Usá solo minúsculas, números y guiones." required />
      <Input name="category" label="Categoría" defaultValue={fieldValue(product?.category)} required /><Input name="subcategory" label="Subcategoría" defaultValue={fieldValue(product?.subcategory)} /><Input name="brand" label="Marca" defaultValue={fieldValue(product?.brand)} />
      <Textarea name="shortDescription" label="Descripción corta" defaultValue={fieldValue(product?.shortDescription)} /><Textarea name="longDescription" label="Descripción larga" defaultValue={fieldValue(product?.longDescription)} />
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} />Publicado</label><label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} />Destacado</label>
    </div></section>
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Precio y stock</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <Input name="priceSale" label="Precio de venta" type="number" min="0" step="0.01" defaultValue={fieldValue(product?.priceSale.toString())} required /><Input name="priceCost" label="Precio de costo" type="number" min="0" step="0.01" defaultValue={fieldValue(product?.priceCost?.toString())} />
      <Input name="stock" label="Stock actual" type="number" min="0" step="1" defaultValue={fieldValue(product?.stock ?? 0)} required /><Input name="minStock" label="Stock mínimo" type="number" min="0" step="1" defaultValue={fieldValue(product?.minStock ?? 0)} required />
      <Input name="location" label="Ubicación física" defaultValue={fieldValue(product?.location)} /><Input name="supplier" label="Proveedor" defaultValue={fieldValue(product?.supplier)} />
    </div></section>
    <ProductImageManager existingImages={product?.images.map((image) => ({ id: image.id, url: image.url })) ?? []} onChange={setImageState} />
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Técnico y SEO</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <Textarea name="technicalAttributes" label="Atributos técnicos JSON" defaultValue={technicalAttributes} /><Input name="tags" label="Etiquetas separadas por coma" defaultValue={product?.tags.join(", ") ?? ""} />
      <Input name="datasheetUrl" label="URL de hoja técnica" defaultValue={fieldValue(product?.datasheetUrl)} placeholder="https://..." /><Input name="manualUrl" label="URL de manual" defaultValue={fieldValue(product?.manualUrl)} placeholder="https://..." />
      <Input name="externalUrl" label="URL externa" defaultValue={fieldValue(product?.externalUrl)} placeholder="https://..." /><Input name="metaTitle" label="Meta title" defaultValue={fieldValue(product?.metaTitle)} /><Input name="metaDescription" label="Meta description" defaultValue={fieldValue(product?.metaDescription)} />
    </div></section>
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Notas internas</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Textarea name="internalNotes" label="Notas privadas" defaultValue={fieldValue(product?.internalNotes)} /><Textarea name="supplierNotes" label="Observaciones del proveedor" defaultValue={fieldValue(product?.supplierNotes)} /><Textarea name="technicalWarnings" label="Advertencias técnicas" defaultValue={fieldValue(product?.technicalWarnings)} /></div></section>
    {message ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{message}</p> : null}
    <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Procesando imágenes y guardando…" : "Guardar producto"}</button>
  </form>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...inputProps } = props; return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<input className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-900" {...inputProps} /></label>; }
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) { const { label, ...textareaProps } = props; return <label className="grid gap-1 text-sm font-medium text-slate-700">{label}<textarea className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900" {...textareaProps} /></label>; }
