"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/customer-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function signInWithGoogle(formData?: FormData) {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin") ?? "http://localhost:3000";
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestOrigin;
  const next = safeNextPath(String(formData?.get("next") ?? "/cuenta"));
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=oauth");
  }

  redirect(data.url);
}

export async function logoutCustomer() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
