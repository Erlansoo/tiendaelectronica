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

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const total = lines.reduce((sum, line) => {
    const product = productById.get(line.productId);
    return sum + (product ? Number(product.priceSale) * line.quantity : 0);
  }, 0);

  function addLine() {
    if (!productId || quantity <= 0) return;
    const product = productById.get(productId);
    if (!product || product.stock < quantity) return;

    setLines((current) => {
      const existing = current.find((line) => line.productId === productId);
      if (!existing) return [...current, { productId, quantity }];
      return current.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + quantity } : line,
      );
    });
  }

  return (
    <form action={createSale} className="space-y-6">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      <section className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Sale items</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto]">
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.sku} - {product.name} ({product.stock} available)
              </option>
            ))}
          </select>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
            min={1}
            type="number"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
          <button
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            type="button"
            onClick={addLine}
          >
            Add
          </button>
        </div>
        <div className="mt-5 divide-y divide-slate-100">
          {lines.length === 0 ? (
            <p className="text-sm text-slate-500">No products added yet.</p>
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
                      Remove
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
        <h2 className="text-base font-semibold text-slate-950">Customer and status</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Input name="customerName" label="Customer name" />
          <Input name="customerPhone" label="Customer phone" />
          <Input name="customerCity" label="City" />
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Payment method
            <select className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" name="paymentMethod" defaultValue="CASH">
              <option value="CASH">Cash</option>
              <option value="QR">QR</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Sale status
            <select className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" name="saleStatus" defaultValue="COMPLETED">
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700 md:col-span-2">
            Notes
            <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-slate-950" name="notes" />
          </label>
        </div>
      </section>

      <button
        className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={lines.length === 0}
      >
        Register sale
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
