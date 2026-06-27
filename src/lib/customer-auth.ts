import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

function customerNameFromUser(user: User) {
  return String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "Customer");
}

function customerImageFromUser(user: User) {
  const image = user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null;
  return typeof image === "string" ? image : null;
}

export function safeNextPath(value: string | null | undefined, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function ensureCustomerAccount(user: User) {
  if (!user.email) return null;

  return prisma.customerAccount.upsert({
    where: { id: user.id },
    update: {
      name: customerNameFromUser(user),
      email: user.email,
      imageUrl: customerImageFromUser(user),
      provider: "google",
    },
    create: {
      id: user.id,
      name: customerNameFromUser(user),
      email: user.email,
      imageUrl: customerImageFromUser(user),
      provider: "google",
    },
    select: { id: true, name: true, email: true, imageUrl: true },
  });
}

export async function getCurrentCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const profile =
    (await prisma.customerAccount.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, imageUrl: true },
    })) ?? (await ensureCustomerAccount(user));

  return {
    id: user.id,
    email: user.email,
    name: profile?.name ?? customerNameFromUser(user),
    imageUrl: profile?.imageUrl ?? customerImageFromUser(user),
  };
}
