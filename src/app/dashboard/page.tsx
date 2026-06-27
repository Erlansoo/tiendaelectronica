import { DashboardCard } from "@/components/DashboardCard";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [products, todaySales, recentProducts, recentMovements] = await Promise.all([
    prisma.product.findMany({ select: { isActive: true, priceSale: true, stock: true, minStock: true } }),
    prisma.sale.aggregate({ where: { createdAt: { gte: today }, saleStatus: "COMPLETED" }, _sum: { total: true } }),
    prisma.product.findMany({ take: 5, orderBy: { createdAt: "desc" } }),
    prisma.stockMovement.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { product: true } }),
  ]);

  const totalActive = products.filter((product) => product.isActive).length;
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const lowStock = products.filter((product) => product.stock > 0 && product.stock <= product.minStock).length;
  const inventoryValue = products.reduce((sum, product) => sum + Number(product.priceSale) * product.stock, 0);

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Summary</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <DashboardCard label="Active products" value={totalActive} />
        <DashboardCard label="Out of stock" value={outOfStock} />
        <DashboardCard label="Low stock" value={lowStock} />
        <DashboardCard label="Today's sales" value={formatMoney(todaySales._sum.total?.toString() ?? 0)} />
        <DashboardCard label="Inventory value" value={formatMoney(inventoryValue)} />
      </div>
      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">Latest products</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {recentProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-slate-900">{product.name}</span>
                <span className="text-slate-500">{product.sku}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-950">Latest stock movements</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {recentMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <span className="font-medium text-slate-900">{movement.product.name}</span>
                <span className="text-slate-500">
                  {movement.previousStock} to {movement.newStock}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
