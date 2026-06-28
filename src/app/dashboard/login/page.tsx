import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { login } from "@/app/actions/auth";
import { signInWithGoogle } from "@/app/actions/customer-auth";

export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-sm rounded-md border border-slate-800 bg-white p-6 shadow-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
          <LockKeyhole size={20} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">Acceso Nubel Systems</h1>
        <p className="mt-2 text-sm text-slate-600">
          El personal autorizado puede gestionar inventario, ventas y movimientos de stock de Nubel Store.
        </p>
        <form action={signInWithGoogle} className="mt-5">
          <input name="next" type="hidden" value="/dashboard" />
          <button className="w-full rounded-md border border-slate-950 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f5a524]">
            Continuar con Google
          </button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          Acceso con contraseña
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={login}>
        {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">Credenciales inválidas.</p> : null}
        <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">
          Email
          <input
            autoComplete="username"
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950"
            name="email"
            type="email"
            required
          />
        </label>
        <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">
          Contraseña
          <input
            autoComplete="current-password"
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950"
            name="password"
            type="password"
            required
          />
        </label>
        <button className="mt-5 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Entrar al dashboard
        </button>
        </form>
        <Link className="mt-4 block text-center text-sm font-medium text-slate-500 hover:text-slate-950" href="/">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}
