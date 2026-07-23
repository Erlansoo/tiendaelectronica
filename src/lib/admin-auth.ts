import { redirect } from "next/navigation";
import { isStoreAdminEmail } from "@/lib/store-admin";
import { prisma } from "@/lib/prisma";
import { isSessionWithinIdleLimit } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function isStoreAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isStoreAdminEmail(user.email)) return false;

  const account = await prisma.customerAccount.findUnique({
    where: { id: user.id },
    select: { lastActivityAt: true },
  });

  return isSessionWithinIdleLimit(account?.lastActivityAt);
}

export async function requireStoreAdmin() {
  if (await isStoreAdminSession()) return;
  redirect("/dashboard/login");
}
