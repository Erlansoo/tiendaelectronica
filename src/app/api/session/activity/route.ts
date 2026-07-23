import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SESSION_ACTIVITY_WRITE_INTERVAL_MS } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreResponse(status: number) {
  return new NextResponse(null, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return noStoreResponse(403);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return noStoreResponse(401);

  const account = await prisma.customerAccount.findUnique({
    where: { id: user.id },
    select: { lastActivityAt: true },
  });
  const now = new Date();

  if (!account || !account.lastActivityAt || now.getTime() - account.lastActivityAt.getTime() >= SESSION_ACTIVITY_WRITE_INTERVAL_MS) {
    await prisma.customerAccount.upsert({
      where: { id: user.id },
      update: { lastActivityAt: now },
      create: {
        id: user.id,
        name: user.user_metadata?.full_name ?? user.email,
        email: user.email,
        imageUrl: user.user_metadata?.avatar_url,
        provider: "google",
        lastActivityAt: now,
      },
    });
  }

  return noStoreResponse(204);
}
