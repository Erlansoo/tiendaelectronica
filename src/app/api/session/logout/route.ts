import { NextRequest, NextResponse } from "next/server";
import { MANUFACTURER_ACCESS_COOKIE } from "@/lib/manufacturer-invite";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
  await supabase.auth.signOut();

  const response = noStoreResponse(204);
  response.cookies.set(MANUFACTURER_ACCESS_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
