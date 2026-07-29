import { EmptyState } from "@/components/EmptyState";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard, productCardGridClass } from "@/components/ProductCard";
import { PublicHeader } from "@/components/PublicHeader";
import { SearchInput } from "@/components/SearchInput";
import { getProductCategory, PRODUCT_CATEGORIES } from "@/lib/product-catalog";
import { getPublicCategories, getPublicProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const { q, page: pageParam, category: categoryParam } = await searchParams;
  const selectedCategory = getProductCategory(categoryParam ?? "")?.name ?? "";
  const requestedPage = Number.parseInt(pageParam ?? "1", 10);
  const [{ products, page, totalPages, query, category }, publicCategoryCounts] = await Promise.all([getPublicProducts(
    q,
    Number.isFinite(requestedPage) ? requestedPage : 1,
    selectedCategory || undefined,
  ), getPublicCategories()]);
  const countByCategory = new Map(publicCategoryCounts.map((item) => [item.category, item._count.category]));
  const queryParams = (nextPage?: number, nextCategory = category) => new URLSearchParams({
    ...(query ? { q: query } : {}),
    ...(nextCategory ? { category: nextCategory } : {}),
    ...(nextPage && nextPage > 1 ? { page: String(nextPage) } : {}),
  }).toString();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              <LocalizedText es="Catálogo" en="Catalog" />
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950">
              <LocalizedText es="Productos" en="Products" />
            </h1>
            <p className="mt-3 max-w-2xl text-slate-600">
              <LocalizedText es="Buscá por nombre, SKU, categoría, marca, etiqueta o descripción técnica." en="Search by name, SKU, category, brand, tag or technical description." />
            </p>
          </div>
            <SearchInput defaultValue={query} placeholder="Buscar por producto, marca o SKU" hiddenFields={category ? { category } : undefined} />
          </div>
          <div className="mt-7 border-t border-slate-100 pt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">Explorar por categoría</p>{category ? <a className="text-sm font-semibold text-[#b16a00] hover:underline" href={`/productos${query ? `?${queryParams(1, "")}` : ""}`}>Ver todas</a> : null}</div>
            <nav className="flex gap-3 overflow-x-auto pb-2" aria-label="Filtrar productos por categoría">
              <a className={`group flex w-28 shrink-0 flex-col rounded-lg border p-3 text-left transition ${!category ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 hover:border-slate-400"}`} href={`/productos${query ? `?${queryParams(1, "")}` : ""}`}><span className={`mb-4 h-2 w-8 rounded-full ${!category ? "bg-[#f5a524]" : "bg-slate-300"}`} /><span className="text-sm font-semibold">Todos</span><span className={`mt-1 text-xs ${!category ? "text-slate-300" : "text-slate-500"}`}>Catálogo completo</span></a>
              {PRODUCT_CATEGORIES.map((item) => { const active = item.name === category; return <a className={`group flex w-36 shrink-0 flex-col rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${active ? "ring-2" : "border-slate-200 bg-slate-50"}`} style={{ borderColor: active ? item.color : undefined, backgroundColor: active ? `${item.color}18` : undefined, boxShadow: active ? `0 0 0 2px ${item.color}20` : undefined }} href={`/productos?${queryParams(1, item.name)}`} key={item.name}><span className="mb-4 h-2 w-8 rounded-full" style={{ backgroundColor: item.color }} /><span className="line-clamp-2 text-sm font-semibold text-slate-950">{item.name}</span><span className="mt-1 text-xs text-slate-500">{countByCategory.get(item.name) ?? 0} producto(s)</span></a>; })}
            </nav>
          </div>
        </div>

        <div className="mb-6 mt-7 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">{category ? `Categoría: ${category}` : "Todos los productos"}{query ? ` · búsqueda: “${query}”` : ""}</p><p className="text-sm font-semibold text-slate-800">{products.length} resultado(s) en esta página</p></div>

        {products.length === 0 ? (
          <EmptyState title="No se encontraron productos" message="Probá con otro término de búsqueda." />
        ) : (
          <div className={productCardGridClass}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} accentColor={getProductCategory(product.category)?.color} />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginación de productos">
            {page > 1 ? (
              <a
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href={`/productos?${queryParams(page - 1)}`}
              >
                Anterior
              </a>
            ) : null}
            <span className="text-sm text-slate-600">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <a
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href={`/productos?${queryParams(page + 1)}`}
              >
                Siguiente
              </a>
            ) : null}
          </nav>
        ) : null}
      </main>
    </>
  );
}
