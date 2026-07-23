import { redirect } from "next/navigation";
import { isStoreAdminEmail } from "@/lib/store-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function isStoreAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return isStoreAdminEmail(user?.email);
}

export async function requireStoreAdmin() {
  if (await isStoreAdminSession()) return;
  redirect("/dashboard/login");
}
