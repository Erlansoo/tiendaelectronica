import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/cuenta";

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      await prisma.customerAccount.upsert({
        where: { id: user.id },
        update: {
          name: user.user_metadata?.full_name ?? user.email,
          email: user.email,
          imageUrl: user.user_metadata?.avatar_url,
          provider: "google",
        },
        create: {
          id: user.id,
          name: user.user_metadata?.full_name ?? user.email,
          email: user.email,
          imageUrl: user.user_metadata?.avatar_url,
          provider: "google",
        },
      });
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
