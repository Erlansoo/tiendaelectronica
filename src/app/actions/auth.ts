"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const password = String(formData.get("password") ?? "");

  if (!configuredPassword || password === configuredPassword) {
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
  redirect("/dashboard/login");
}
