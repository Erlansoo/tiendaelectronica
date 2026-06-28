import { ProductForm } from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Nuevo producto</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
