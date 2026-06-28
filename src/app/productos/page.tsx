import { EmptyState } from "@/components/EmptyState";
import { LocalizedText } from "@/components/LocalizedText";
import { ProductCard } from "@/components/ProductCard";
import { PublicHeader } from "@/components/PublicHeader";
import { SearchInput } from "@/components/SearchInput";
import { getPublicProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await getPublicProducts(q);

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
          <SearchInput defaultValue={q} placeholder="Buscar productos" />
        </div>

        {products.length === 0 ? (
          <EmptyState title="No se encontraron productos" message="Probá con otro término de búsqueda." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
