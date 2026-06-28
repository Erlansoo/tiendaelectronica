import Link from "next/link";
import Image from "next/image";
import { UserCircle } from "lucide-react";
import { logoutCustomer } from "@/app/actions/customer-auth";
import { getCurrentCustomer } from "@/lib/customer-auth";

export async function PublicHeader() {
  const customer = await getCurrentCustomer();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#111111]/95 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="brand-lockup group flex items-center gap-2 rounded-full px-1.5 py-1 text-white">
          <span className="brand-lockup-mark flex h-10 w-10 items-center justify-center rounded-md bg-white p-1.5">
            <Image src="/nubel-store-mark.png" alt="" width={30} height={30} priority />
          </span>
          <span className="brand-lockup-text font-mono text-[15px] font-black uppercase leading-none tracking-[0.08em]">
            Nubel <span className="text-[#f5a524]">Store</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 text-sm font-semibold text-white md:flex">
          <Link className="rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-lg hover:shadow-[#f5a524]/20" href="/">
            Nubel Systems
          </Link>
          <Link className="rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-lg hover:shadow-[#f5a524]/20" href="/#manufacturing">
            Manufacturing
          </Link>
          <Link className="rounded-full border border-transparent px-4 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-lg hover:shadow-[#f5a524]/20" href="/productos">
            Catalog
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {customer ? (
            <>
              <form action={logoutCustomer}>
                <button className="rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-lg hover:shadow-[#f5a524]/20">
                  Logout
                </button>
              </form>
              <div className="group relative">
                <button className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:shadow-lg hover:shadow-[#f5a524]/20">
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
                  {customer.isStoreAdmin ? (
                    <Link className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/dashboard">
                      Store admin
                    </Link>
                  ) : null}
                  <Link className="block rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100" href="/productos">
                    Browse catalog
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link className="rounded-full border border-white/70 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:text-black hover:shadow-lg hover:shadow-[#f5a524]/20" href="/login">
                Login
              </Link>
              <Link className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f5a524] hover:shadow-lg hover:shadow-[#f5a524]/20" href="/crear-cuenta">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
