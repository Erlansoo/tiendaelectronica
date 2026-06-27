import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function getCurrentCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const profile = await prisma.customerAccount.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, imageUrl: true },
  });

  return {
    id: user.id,
    email: user.email,
    name: profile?.name ?? user.user_metadata?.full_name ?? user.email,
    imageUrl: profile?.imageUrl ?? user.user_metadata?.avatar_url ?? null,
  };
}
