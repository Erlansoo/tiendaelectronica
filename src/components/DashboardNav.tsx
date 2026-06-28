import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/actions/auth";

const items = [
  ["Summary", "/dashboard"],
  ["Products", "/dashboard/productos"],
  ["New product", "/dashboard/productos/nuevo"],
  ["Sales", "/dashboard/ventas"],
  ["New sale", "/dashboard/ventas/nueva"],
  ["Inventory", "/dashboard/inventario"],
  ["Stock movements", "/dashboard/stock-movements"],
  ["Settings", "/dashboard/configuracion"],
];

export function DashboardNav() {
  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="px-5 py-5">
        <Link href="/" className="flex items-center gap-2 text-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
            <Image src="/nubel-store-mark.png" alt="" width={30} height={30} />
          </span>
          <span className="font-mono text-[15px] font-black uppercase leading-none tracking-[0.08em]">
            Nubel <span className="text-[#f5a524]">Store</span>
          </span>
        </Link>
        <p className="mt-1 text-sm text-slate-500">Nubel Systems dashboard</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:grid lg:overflow-visible">
        {items.map(([label, href]) => (
          <Link
            key={href}
            className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            href={href}
          >
            {label}
          </Link>
        ))}
      </nav>
      <form action={logout} className="hidden px-5 pb-5 lg:block">
        <button className="text-sm font-medium text-slate-500 transition hover:text-slate-950">Sign out</button>
      </form>
    </aside>
  );
}
