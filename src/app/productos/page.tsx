import { EmptyState } from "@/components/EmptyState";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard, productCardGridClass } from "@/components/ProductCard";
import { PublicHeader } from "@/components/PublicHeader";
import { SearchInput } from "@/components/SearchInput";
import { getPublicProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const requestedPage = Number.parseInt(pageParam ?? "1", 10);
  const { products, page, totalPages, query } = await getPublicProducts(
    q,
    Number.isFinite(requestedPage) ? requestedPage : 1,
  );

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_420px] lg:items-end">
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
          <SearchInput defaultValue={query} placeholder="Buscar productos" />
        </div>

        {products.length === 0 ? (
          <EmptyState title="No se encontraron productos" message="Probá con otro término de búsqueda." />
        ) : (
          <div className={productCardGridClass}>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        {totalPages > 1 ? (
          <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Paginación de productos">
            {page > 1 ? (
              <a
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                href={`/productos?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1) })}`}
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
                href={`/productos?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1) })}`}
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
