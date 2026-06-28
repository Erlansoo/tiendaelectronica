import Link from "next/link";
import { signInWithGoogle } from "@/app/actions/customer-auth";
import { LocalizedText } from "@/components/LocalizedText";
import { PublicHeader } from "@/components/PublicHeader";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-6 py-12 lg:px-8">
        <section className="w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            <LocalizedText es="Acceso de cliente" en="Customer access" />
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-black">
            <LocalizedText es="Ingresar con Google" en="Login with Google" />
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            <LocalizedText es="Las cuentas de Nubel Store se crean e ingresan solo con Google." en="Nubel Store accounts are created and accessed only with Google." />
          </p>
          {error ? (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">
              <LocalizedText es="No se pudo completar el ingreso con Google." en="Google login could not be completed." />
            </p>
          ) : null}
          <form action={signInWithGoogle} className="mt-6">
            <button className="flex w-full items-center justify-center gap-3 rounded-full border border-black px-4 py-3 text-sm font-semibold text-black transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5a524] hover:bg-[#f5a524] hover:shadow-lg hover:shadow-[#f5a524]/20">
              <span className="text-lg">G</span>
              <LocalizedText es="Continuar con Google" en="Continue with Google" />
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-neutral-600">
            <LocalizedText es="¿Sos nuevo?" en="New here?" />{" "}
            <Link className="font-semibold text-black hover:underline" href="/crear-cuenta">
              <LocalizedText es="Crear cuenta con Google" en="Create account with Google" />
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
