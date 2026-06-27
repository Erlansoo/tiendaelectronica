"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/customer-auth";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function normalizeAppUrl(value: string | undefined | null) {
  if (!value) return null;
  const url = value.startsWith("http") ? value : `https://${value}`;
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(value: string | null) {
  return Boolean(value && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value));
}

export async function signInWithGoogle(formData?: FormData) {
  const requestHeaders = await headers();
  const requestOrigin = normalizeAppUrl(requestHeaders.get("origin"));
  const forwardedProto = requestHeaders.get("x-forwarded-proto") ?? "https";
  const forwardedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : null;
  const configuredUrl = normalizeAppUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const vercelUrl = normalizeAppUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL);
  const appUrl =
    process.env.NODE_ENV === "production"
      ? [configuredUrl, vercelUrl, forwardedOrigin, requestOrigin].find((url) => url && !isLocalhostUrl(url))!
      : (configuredUrl ?? requestOrigin ?? "http://localhost:3000");
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
