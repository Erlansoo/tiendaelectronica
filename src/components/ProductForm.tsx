"use client";

import type { Product, ProductImage } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProduct, prepareProductImageUpload, updateProduct } from "@/app/actions/products";
import { ManufacturerFieldHelp } from "@/components/ManufacturerFieldHelp";
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
      <Input name="name" label="Nombre" help="Nombre comercial claro que verá el cliente. Incluye modelo, capacidad o medida cuando ayude a identificar el producto." defaultValue={fieldValue(product?.name)} required /><Input name="sku" label="SKU" help="Código interno único para identificar el producto en inventario, ventas y reposiciones. Ejemplo: NUB-ARD-UNO-R4." defaultValue={fieldValue(product?.sku)} required />
      <Input name="slug" label="Slug" help="Parte final de la URL pública del producto. Usa minúsculas, números y guiones; por ejemplo: arduino-uno-r4." defaultValue={fieldValue(product?.slug)} pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Usá solo minúsculas, números y guiones." required />
      <Input name="category" label="Categoría" help="Grupo principal para que los clientes encuentren el producto. Ejemplo: Microcontroladores, Sensores o Herramientas." defaultValue={fieldValue(product?.category)} required /><Input name="subcategory" label="Subcategoría" help="Clasificación más específica dentro de la categoría. Es opcional; por ejemplo: Arduino, ESP32 o Sensores de temperatura." defaultValue={fieldValue(product?.subcategory)} /><Input name="brand" label="Marca" help="Marca o fabricante real del producto. Déjalo vacío solo si no corresponde o se desconoce." defaultValue={fieldValue(product?.brand)} />
      <Textarea name="shortDescription" label="Descripción corta" help="Resumen de una o dos frases que explica qué es el producto y su principal uso. Aparece en el catálogo." defaultValue={fieldValue(product?.shortDescription)} /><Textarea name="longDescription" label="Descripción larga" help="Detalle completo para orientar al comprador: compatibilidad, usos, contenido del paquete, limitaciones y recomendaciones." defaultValue={fieldValue(product?.longDescription)} />
      <Check name="isActive" label="Publicado" help="Si está marcado, el producto será visible para los clientes en el catálogo. Desmárcalo para conservarlo sin venderlo públicamente." defaultChecked={product?.isActive ?? true} /><Check name="isFeatured" label="Destacado" help="Da prioridad visual al producto en las secciones destacadas de la tienda. Úsalo solo para productos importantes." defaultChecked={product?.isFeatured ?? false} />
    </div></section>
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Precio y stock</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <Input name="priceSale" label="Precio de venta" help="Precio final que verá el cliente, expresado en bolivianos (Bs). Incluye los decimales solo cuando sean necesarios." type="number" min="0" step="0.01" defaultValue={fieldValue(product?.priceSale.toString())} required /><Input name="priceCost" label="Precio de costo" help="Costo de compra por unidad. Es privado y se usa para calcular el margen; nunca se muestra a los clientes." type="number" min="0" step="0.01" defaultValue={fieldValue(product?.priceCost?.toString())} />
      <Input name="stock" label="Stock actual" help="Cantidad física disponible para vender ahora. Debe ser un número entero de unidades." type="number" min="0" step="1" defaultValue={fieldValue(product?.stock ?? 0)} required /><Input name="minStock" label="Stock mínimo" help="Nivel a partir del cual conviene reponer. Sirve para alertarte antes de quedarte sin unidades." type="number" min="0" step="1" defaultValue={fieldValue(product?.minStock ?? 0)} required />
      <Input name="location" label="Ubicación física" help="Lugar interno donde se guarda el producto, por ejemplo: Estante A-2, Caja 4 o Taller. No se muestra públicamente." defaultValue={fieldValue(product?.location)} /><Input name="supplier" label="Proveedor" help="Empresa o persona a la que compras este producto. Es información interna para facilitar reposiciones." defaultValue={fieldValue(product?.supplier)} />
    </div></section>
    <ProductImageManager existingImages={product?.images.map((image) => ({ id: image.id, url: image.url })) ?? []} onChange={setImageState} />
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Técnico y SEO</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <Textarea name="technicalAttributes" label="Atributos técnicos JSON" help={'Especificaciones estructuradas para la ficha técnica. Ejemplo: {"Voltaje":"5 V","Corriente":"2 A"}. Si no manejas JSON, puedes dejarlo vacío.'} defaultValue={technicalAttributes} /><Input name="tags" label="Etiquetas separadas por coma" help="Palabras clave para facilitar la búsqueda interna, separadas por comas. Ejemplo: arduino, microcontrolador, robótica." defaultValue={product?.tags.join(", ") ?? ""} />
      <Input name="datasheetUrl" label="URL de hoja técnica" help="Enlace HTTPS oficial al datasheet o ficha del fabricante. Es opcional, pero muy útil para componentes electrónicos." defaultValue={fieldValue(product?.datasheetUrl)} placeholder="https://..." /><Input name="manualUrl" label="URL de manual" help="Enlace HTTPS al manual de uso, instalación o programación del producto, si existe." defaultValue={fieldValue(product?.manualUrl)} placeholder="https://..." />
      <Input name="externalUrl" label="URL externa" help="Enlace complementario y confiable, por ejemplo la página oficial del fabricante. No se usa para las imágenes del producto." defaultValue={fieldValue(product?.externalUrl)} placeholder="https://..." /><Input name="metaTitle" label="Meta title" help="Título para buscadores. Si lo dejas vacío, Nubel usará el nombre del producto." defaultValue={fieldValue(product?.metaTitle)} /><Input name="metaDescription" label="Meta description" help="Resumen para buscadores, idealmente claro y breve. Si lo dejas vacío, Nubel usará la descripción del producto." defaultValue={fieldValue(product?.metaDescription)} />
    </div></section>
    <section className="rounded-md border border-slate-200 bg-white p-5"><h2 className="text-base font-semibold text-slate-950">Notas internas</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><Textarea name="internalNotes" label="Notas privadas" help="Comentarios internos para quien administre la tienda. Los clientes no podrán verlos." defaultValue={fieldValue(product?.internalNotes)} /><Textarea name="supplierNotes" label="Observaciones del proveedor" help="Datos útiles para volver a comprar: contacto, precio acordado, plazo, lote o condiciones del proveedor. Es privado." defaultValue={fieldValue(product?.supplierNotes)} /><Textarea name="technicalWarnings" label="Advertencias técnicas" help="Precauciones importantes del producto, como voltaje máximo, polaridad, fragilidad o requisitos de instalación." defaultValue={fieldValue(product?.technicalWarnings)} /></div></section>
    {message ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{message}</p> : null}
    <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50" disabled={pending} type="submit">{pending ? "Procesando imágenes y guardando…" : "Guardar producto"}</button>
  </form>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; help?: string }) { const { label, help, ...inputProps } = props; return <label className="grid gap-1 text-sm font-medium text-slate-700">{help ? <ManufacturerFieldHelp label={label} help={help} /> : label}<input className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-900" {...inputProps} /></label>; }
function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; help?: string }) { const { label, help, ...textareaProps } = props; return <label className="grid gap-1 text-sm font-medium text-slate-700">{help ? <ManufacturerFieldHelp label={label} help={help} /> : label}<textarea className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900" {...textareaProps} /></label>; }
function Check({ name, label, help, defaultChecked }: { name: string; label: string; help: string; defaultChecked: boolean }) { return <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><label className="flex items-center gap-2"><input name={name} type="checkbox" defaultChecked={defaultChecked} />{label}</label><ManufacturerFieldHelp label={label} help={help} showLabel={false} /></div>; }
