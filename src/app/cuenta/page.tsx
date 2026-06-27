import { redirect } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            {customer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-16 w-16 rounded-full object-cover" src={customer.imageUrl} alt={customer.name} />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-xl font-semibold text-white">
                {customer.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">User dashboard</p>
              <h1 className="mt-1 text-3xl font-semibold text-black">{customer.name}</h1>
              <p className="mt-1 text-sm text-neutral-600">{customer.email}</p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-md border border-neutral-200 p-4">
              <h2 className="font-semibold text-black">Orders</h2>
              <p className="mt-2 text-sm text-neutral-600">Future customer order history will appear here.</p>
            </div>
            <div className="rounded-md border border-neutral-200 p-4">
              <h2 className="font-semibold text-black">Profile</h2>
              <p className="mt-2 text-sm text-neutral-600">Account identity is active for storefront sessions.</p>
            </div>
            <div className="rounded-md border border-neutral-200 p-4">
              <h2 className="font-semibold text-black">Support</h2>
              <p className="mt-2 text-sm text-neutral-600">Use WhatsApp from any product page to request availability.</p>
            </div>
            {customer.isStoreAdmin ? (
              <div className="rounded-md border border-black bg-black p-4 text-white">
                <h2 className="font-semibold">Store admin</h2>
                <p className="mt-2 text-sm text-neutral-300">Manage electronics products, sales and inventory.</p>
                <Link className="mt-4 inline-flex rounded-full bg-[#f5a524] px-4 py-2 text-sm font-semibold text-black" href="/dashboard">
                  Open dashboard
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
