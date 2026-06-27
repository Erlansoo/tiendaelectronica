import Link from "next/link";
import { Cpu, UserCircle } from "lucide-react";
import { logoutCustomer } from "@/app/actions/customer-auth";
import { getCurrentCustomer } from "@/lib/customer-auth";

export async function PublicHeader() {
  const customer = await getCurrentCustomer();

  return (
    <header className="border-b border-black/10 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-black">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white">
            <Cpu size={19} aria-hidden />
          </span>
          Nubel Store
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-neutral-700 md:flex">
          <Link className="hover:text-black" href="/">
            Nubel Systems
          </Link>
          <Link className="hover:text-black" href="/#manufacturing">
            Manufacturing
          </Link>
          <Link className="hover:text-black" href="/productos">
            Catalog
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {customer ? (
            <>
              <form action={logoutCustomer}>
                <button className="rounded-md border border-black px-4 py-2 text-sm font-semibold text-black transition hover:border-[#f5a524] hover:bg-[#f5a524]">
                  Logout
                </button>
              </form>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-md bg-black px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#f5a524] hover:text-black">
                  {customer.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="h-7 w-7 rounded-full object-cover" src={customer.imageUrl} alt={customer.name} />
                  ) : (
                    <UserCircle size={22} aria-hidden />
                  )}
                  <span className="hidden sm:inline">{customer.name}</span>
                </button>
                <div className="invisible absolute right-0 z-20 mt-2 w-56 rounded-md border border-black/10 bg-white p-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  <Link className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/cuenta">
                    User dashboard
                  </Link>
                  <Link className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/productos">
                    Browse catalog
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link className="rounded-md border border-black px-4 py-2 text-sm font-semibold text-black transition hover:border-[#f5a524] hover:bg-[#f5a524]" href="/login">
                Login
              </Link>
              <Link className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f5a524] hover:text-black" href="/crear-cuenta">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
