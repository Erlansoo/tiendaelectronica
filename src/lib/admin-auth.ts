import { redirect } from "next/navigation";
import { canAccessStoreDashboard, isStoreAdminEmail } from "@/lib/store-admin";
import { prisma } from "@/lib/prisma";
import { isSessionWithinIdleLimit } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

async function getStoreDashboardSessionEmail() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const account = await prisma.customerAccount.findUnique({
    where: { id: user.id },
    select: { lastActivityAt: true },
  });

  return isSessionWithinIdleLimit(account?.lastActivityAt) ? user.email : null;
}

export async function isStoreAdminSession() {
  const email = await getStoreDashboardSessionEmail();
  return isStoreAdminEmail(email);
}

export async function isStoreOperatorSession() {
  const email = await getStoreDashboardSessionEmail();
  return canAccessStoreDashboard(email);
}

export async function requireStoreAdmin() {
  if (await isStoreAdminSession()) return;
  redirect("/dashboard/login");
}

export async function requireStoreOperator() {
  if (await isStoreOperatorSession()) return;
  redirect("/dashboard/login");
}
