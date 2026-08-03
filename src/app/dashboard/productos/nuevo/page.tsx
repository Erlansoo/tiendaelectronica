import { ProductForm } from "@/components/ProductForm";
import { requireStoreOperator } from "@/lib/admin-auth";

export default async function NewProductPage() {
  await requireStoreOperator();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Nuevo producto</h1>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}
