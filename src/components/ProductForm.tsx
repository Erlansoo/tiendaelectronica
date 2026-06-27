import type { Product } from "@prisma/client";
import { createProduct, updateProduct } from "@/app/actions/products";

function fieldValue(value?: string | number | null) {
  return value ?? "";
}

export function ProductForm({ product }: { product?: Product }) {
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const technicalAttributes = product?.technicalAttributes
    ? JSON.stringify(product.technicalAttributes, null, 2)
    : "";

  return (
    <form action={action} className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Basic data</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input name="name" label="Name" defaultValue={fieldValue(product?.name)} required />
          <Input name="sku" label="SKU" defaultValue={fieldValue(product?.sku)} required />
          <Input name="slug" label="Slug" defaultValue={fieldValue(product?.slug)} required />
          <Input name="category" label="Category" defaultValue={fieldValue(product?.category)} required />
          <Input name="subcategory" label="Subcategory" defaultValue={fieldValue(product?.subcategory)} />
          <Input name="brand" label="Brand" defaultValue={fieldValue(product?.brand)} />
          <Textarea name="shortDescription" label="Short description" defaultValue={fieldValue(product?.shortDescription)} />
          <Textarea name="longDescription" label="Long description" defaultValue={fieldValue(product?.longDescription)} />
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input name="isActive" type="checkbox" defaultChecked={product?.isActive ?? true} />
            Published
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured ?? false} />
            Featured
          </label>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Price and stock</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input name="priceSale" label="Sale price" type="number" step="0.01" defaultValue={fieldValue(product?.priceSale.toString())} required />
          <Input name="priceCost" label="Cost price" type="number" step="0.01" defaultValue={fieldValue(product?.priceCost?.toString())} />
          <Input name="stock" label="Current stock" type="number" defaultValue={fieldValue(product?.stock ?? 0)} required />
          <Input name="minStock" label="Minimum stock" type="number" defaultValue={fieldValue(product?.minStock ?? 0)} required />
          <Input name="location" label="Physical location" defaultValue={fieldValue(product?.location)} />
          <Input name="supplier" label="Supplier" defaultValue={fieldValue(product?.supplier)} />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Technical, media and SEO</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Textarea name="technicalAttributes" label="Technical attributes JSON" defaultValue={technicalAttributes} />
          <Input name="tags" label="Tags, comma separated" defaultValue={product?.tags.join(", ") ?? ""} />
          <Input name="imageUrl" label="Image URL" defaultValue={fieldValue(product?.imageUrl)} />
          <Input name="datasheetUrl" label="Datasheet URL" defaultValue={fieldValue(product?.datasheetUrl)} />
          <Input name="manualUrl" label="Manual URL" defaultValue={fieldValue(product?.manualUrl)} />
          <Input name="externalUrl" label="External URL" defaultValue={fieldValue(product?.externalUrl)} />
          <Input name="metaTitle" label="Meta title" defaultValue={fieldValue(product?.metaTitle)} />
          <Input name="metaDescription" label="Meta description" defaultValue={fieldValue(product?.metaDescription)} />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Internal notes</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Textarea name="internalNotes" label="Private notes" defaultValue={fieldValue(product?.internalNotes)} />
          <Textarea name="supplierNotes" label="Supplier observations" defaultValue={fieldValue(product?.supplierNotes)} />
          <Textarea name="technicalWarnings" label="Technical warnings" defaultValue={fieldValue(product?.technicalWarnings)} />
        </div>
      </section>

      <button className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
        Save product
      </button>
    </form>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-slate-900" {...inputProps} />
    </label>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...textareaProps } = props;
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <textarea className="min-h-28 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900" {...textareaProps} />
    </label>
  );
}
