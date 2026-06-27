import { notFound } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div>
      <h1 className="text-3xl font-semibold text-slate-950">Edit product</h1>
      <div className="mt-6">
        <ProductForm product={product} />
      </div>
    </div>
  );
}
