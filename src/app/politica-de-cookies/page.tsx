import { PublicHeader } from "@/components/PublicHeader";

export default function CookiePolicyPage() {
  return (
    <>
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Nubel Store</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Política de cookies y caché</h1>
          <div className="mt-7 space-y-6 text-sm leading-6 text-slate-700">
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Cookies necesarias</h2>
              <p className="mt-2">Las cookies de Supabase mantienen tu sesión de Google y protegen el acceso a tu cuenta y al dashboard. Son necesarias para iniciar sesión y no se usan para publicidad.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Preferencias opcionales</h2>
              <p className="mt-2">Si aceptás, guardamos localmente el idioma elegido. Si elegís “Solo necesarias”, eliminamos esa preferencia y no almacenamos datos opcionales en el navegador.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Caché y seguridad</h2>
              <p className="mt-2">Las páginas de cuenta, autenticación, dashboard y API no se almacenan en caché compartida. Los recursos públicos como imágenes pueden almacenarse temporalmente para mejorar la velocidad, sin incluir datos de sesión.</p>
            </section>
            <section>
              <h2 className="text-lg font-semibold text-slate-950">Tu elección</h2>
              <p className="mt-2">Recordamos tu decisión durante 180 días con una cookie necesaria. Podés cambiarla en cualquier momento desde el botón “Preferencias de cookies” que aparece en la tienda.</p>
            </section>
          </div>
        </article>
      </main>
    </>
  );
}
