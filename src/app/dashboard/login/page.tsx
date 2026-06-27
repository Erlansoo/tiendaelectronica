import { login } from "@/app/actions/auth";

export default async function DashboardLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-6">
      <form action={login} className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-950">Dashboard access</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the admin password configured in the environment.</p>
        {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">Invalid password.</p> : null}
        <label className="mt-5 grid gap-1 text-sm font-medium text-slate-700">
          Password
          <input className="h-11 rounded-md border border-slate-300 px-3 text-slate-950" name="password" type="password" />
        </label>
        <button className="mt-5 w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800">
          Enter dashboard
        </button>
      </form>
    </main>
  );
}
