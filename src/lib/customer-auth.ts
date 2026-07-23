import { prisma } from "@/lib/prisma";
import { isStoreAdminEmail } from "@/lib/store-admin";
import { isSessionWithinIdleLimit } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export function safeNextPath(value: string | null | undefined, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function getCurrentCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const profile = await prisma.customerAccount
    .findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, imageUrl: true, lastActivityAt: true },
    })
    .catch((error) => {
      console.error("Customer profile lookup failed", error);
      return null;
  });

  if (!isSessionWithinIdleLimit(profile?.lastActivityAt)) return null;

  return {
    id: user.id,
    email: user.email,
    name: profile?.name ?? user.user_metadata?.full_name ?? user.email,
    imageUrl: profile?.imageUrl ?? user.user_metadata?.avatar_url ?? null,
    isStoreAdmin: isStoreAdminEmail(user.email),
  };
}
