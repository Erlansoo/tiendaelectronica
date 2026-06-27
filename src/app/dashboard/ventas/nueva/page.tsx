import { SaleForm } from "@/components/SaleForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">New sale</h1>
      <p className="mt-1 text-sm text-slate-600">Completed sales automatically discount stock.</p>
      <div className="mt-6">
        <SaleForm
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category,
            stock: product.stock,
            priceSale: product.priceSale.toString(),
          }))}
        />
      </div>
    </div>
  );
}
