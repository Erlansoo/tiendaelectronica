import Link from "next/link";
import { registerCustomer } from "@/app/actions/customer-auth";
import { PublicHeader } from "@/components/PublicHeader";

export default async function CreateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl place-items-center px-6 py-12 lg:px-8">
        <form action={registerCustomer} className="w-full max-w-md rounded-md border border-black/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Nubel Store</p>
          <h1 className="mt-2 text-3xl font-semibold text-black">Create account</h1>
          <p className="mt-2 text-sm text-neutral-600">Create a customer profile for future orders and account features.</p>
          {error === "exists" ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">That email is already registered.</p> : null}
          {error === "invalid" ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-700">Use a name, valid email and password of at least 8 characters.</p> : null}
          <label className="mt-5 grid gap-1 text-sm font-medium text-neutral-700">
            Name
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-black outline-none focus:border-black" name="name" required />
          </label>
          <label className="mt-4 grid gap-1 text-sm font-medium text-neutral-700">
            Email
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-black outline-none focus:border-black" name="email" type="email" required />
          </label>
          <label className="mt-4 grid gap-1 text-sm font-medium text-neutral-700">
            Password
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-black outline-none focus:border-black" name="password" type="password" minLength={8} required />
          </label>
          <label className="mt-4 grid gap-1 text-sm font-medium text-neutral-700">
            Profile image URL
            <input className="h-11 rounded-md border border-neutral-300 px-3 text-black outline-none focus:border-black" name="imageUrl" type="url" placeholder="Optional" />
          </label>
          <button className="mt-5 w-full rounded-md bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#f5a524] hover:text-black">
            Create account
          </button>
          <p className="mt-4 text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link className="font-semibold text-black hover:underline" href="/login">
              Login
            </Link>
          </p>
        </form>
      </main>
    </>
  );
}
