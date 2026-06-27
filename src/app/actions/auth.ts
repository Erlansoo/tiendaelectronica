"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function login(formData: FormData) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (
    configuredEmail &&
    configuredPassword &&
    email === configuredEmail.trim().toLowerCase() &&
    password === configuredPassword
  ) {
    const cookieStore = await cookies();
    cookieStore.set("dashboard_session", "active", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    redirect("/dashboard");
  }

  redirect("/dashboard/login?error=1");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("dashboard_session");
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/dashboard/login");
}
