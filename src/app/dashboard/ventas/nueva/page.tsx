import { SaleForm } from "@/components/SaleForm";
import { requireStoreOperator } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  await requireStoreOperator();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Nueva venta</h1>
      <p className="mt-1 text-sm text-slate-600">Las ventas completadas descuentan el stock automáticamente.</p>
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
