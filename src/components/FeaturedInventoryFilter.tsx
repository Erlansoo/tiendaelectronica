"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard, type ProductCardProduct } from "@/components/ProductCard";

export type FeaturedCategory = {
  label: string;
  labelEn: string;
  query: string;
  description: string;
  descriptionEn: string;
  color: string;
};

export type FeaturedProduct = ProductCardProduct & {
  id: string;
};

export function FeaturedInventoryFilter({
  categories,
  products,
}: {
  categories: FeaturedCategory[];
  products: FeaturedProduct[];
}) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedCategories), [selectedCategories]);
  const activeProducts =
    selectedCategories.length === 0
      ? products
      : products.filter((product) => selectedSet.has(product.category));

  const colorByCategory = useMemo(
    () => new Map(categories.map((category) => [category.query, category.color])),
    [categories],
  );

  const toggleCategory = (category: string) => {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="border-l-4 border-[#f5a524] bg-white pl-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#b16a00]">
            <LocalizedText es="Estructura de compra" en="Browse structure" />
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            <LocalizedText es="Categorías de inventario" en="Inventory categories" />
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            <LocalizedText
              es="Seleccioná una o varias categorías. Sin selección se muestran todos los destacados."
              en="Select one or multiple categories. With no selection, all featured items are shown."
            />
          </p>
        </div>

        <nav className="mt-5 grid gap-2" aria-label="Categorías de inventario">
          {categories.map((category) => {
            const isSelected = selectedSet.has(category.query);

            return (
              <button
                key={category.label}
                type="button"
                className="group rounded-md border bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                style={{
                  borderColor: isSelected ? category.color : "#e2e8f0",
                  backgroundColor: isSelected ? `${category.color}18` : "#ffffff",
                  boxShadow: isSelected ? `0 10px 24px ${category.color}1f` : undefined,
                }}
                onClick={() => toggleCategory(category.query)}
                aria-pressed={isSelected}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-950">
                    <LocalizedText es={category.label} en={category.labelEn} />
                  </span>
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-0.5"
                    style={{ color: isSelected ? category.color : "#94a3b8" }}
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  <LocalizedText es={category.description} en={category.descriptionEn} />
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-950">
            <LocalizedText es="Inventario destacado" en="Featured inventory" />
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            <LocalizedText
              es="Productos listos para proyectos técnicos."
              en="Products ready for technical projects."
            />
          </p>
        </div>

        {activeProducts.length > 0 ? (
          <div className="grid justify-start gap-5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,225px),255px))] 2xl:gap-6">
            {activeProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                accentColor={colorByCategory.get(product.category)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600">
            <LocalizedText
              es="Todavía no hay productos destacados en esta categoría."
              en="There are no featured products in this category yet."
            />
          </div>
        )}
      </div>
    </div>
  );
}
