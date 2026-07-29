"use client";

import { useMemo, useState } from "react";
import { createSale } from "@/app/actions/sales";
import { formatMoney } from "@/lib/format";

type SaleProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  priceSale: string;
};

type SaleLine = {
  productId: string;
  quantity: number;
};

export function SaleForm({ products }: { products: SaleProduct[] }) {
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [lineError, setLineError] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const total = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return sum + (product ? Number(product.priceSale) * line.quantity : 0);
  }, 0);

  function addLine() {
    setLineError(null);
    const normalizedQuantity = Math.trunc(quantity);
    if (!productId || normalizedQuantity <= 0) {
      setLineError("Ingresá una cantidad entera mayor a cero.");
      return;
    }
    const product = productById.get(productId);
    if (!product) return;
    const currentQuantity = lines.find((line) => line.productId === productId)?.quantity ?? 0;
    if (currentQuantity + normalizedQuantity > product.stock) {
      setLineError(`Solo hay ${product.stock} unidad(es) disponibles de ${product.name}.`);
      return;
    }

    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (!existing) return [...current, { productId, quantity: normalizedQuantity }];
      return current.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + normalizedQuantity } : line,
      );
    });
  }

  return (
    <form action={createSale} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Productos de la venta</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id} disabled={product.stock === 0}>
                {product.sku} - {product.name} ({product.stock} disponible(s))
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
            min={1}
            step={1}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            type="button"
            onClick={addLine}
          >
            Añadir
          </button>
        </div>
        {lineError ? <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{lineError}</p> : null}
        <div className="mt-5 divide-y divide-slate-100">
          {lines.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no añadiste productos a esta venta.</p>
          ) : (
            lines.map((line) => {
              const product = productById.get(line.productId);
              if (!product) return null;
              return (
                <div key={line.productId} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-950">{product.name}</p>
                    <p className="text-slate-500">
                      {line.quantity} x {formatMoney(product.priceSale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-950">{formatMoney(Number(product.priceSale) * line.quantity)}</span>
                    <button
                      className="text-sm font-medium text-rose-600"
                      type="button"
                      onClick={() => setLines((current) => current.filter((item) => item.productId !== line.productId))}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="mt-5 text-right text-xl font-semibold text-slate-950">Total: {formatMoney(total)}</div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Cliente y estado</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input name="customerName" label="Nombre del cliente" />
          <Input name="customerPhone" label="Teléfono del cliente" />
          <Input name="customerCity" label="Ciudad" />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Método de pago
            <select className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" name="paymentMethod" defaultValue="CASH">
              <option value="CASH">Efectivo</option>
              <option value="QR">QR</option>
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="PENDING">Pendiente</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Estado de la venta
            <select className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" name="saleStatus" defaultValue="COMPLETED">
              <option value="COMPLETED">Completada</option>
              <option value="PENDING">Pendiente</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Notas
            <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="notes" />
          </label>
        </div>
      </section>

      <button
        className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={lines.length === 0}
      >
        Registrar venta
      </button>
    </form>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...inputProps } = props;
  return (
    <label className="grid gap-1 text-sm font-medium text-slate-700">
      {label}
      <input className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" {...inputProps} />
    </label>
  );
}
