import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { signInWithGoogle } from "@/app/actions/customer-auth";

export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6">
      <section className="w-full max-w-sm rounded-md border border-slate-800 bg-white p-6 shadow-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-slate-950 text-white">
          <LockKeyhole size={20} aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-950">Acceso Nubel Systems</h1>
        <p className="mt-2 text-sm text-slate-600">El personal autorizado ingresa con su cuenta de Google corporativa.</p>
        {error === "forbidden" ? (
          <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">
            Esta cuenta no tiene acceso al dashboard.
          </p>
        ) : null}
        {reason === "inactive" ? (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Tu sesión se cerró después de 15 minutos sin actividad.
          </p>
        ) : null}
        <form action={signInWithGoogle} className="mt-5">
          <input name="next" type="hidden" value="/dashboard" />
          <button className="w-full rounded-md border border-slate-950 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-[#f5a524]">
            Continuar con Google
          </button>
        </form>
        <Link className="mt-4 block text-center text-sm font-medium text-slate-500 hover:text-slate-950" href="/">
          Volver a la tienda
        </Link>
      </section>
    </main>
  );
}
