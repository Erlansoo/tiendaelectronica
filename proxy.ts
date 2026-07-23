import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStoreAdminEmail } from "@/lib/store-admin";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const isLogin = request.nextUrl.pathname === "/dashboard/login";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isGoogleStoreAdmin = isStoreAdminEmail(user?.email);

  if (isLogin) {
    return response;
  }

  if (isGoogleStoreAdmin) return response;

  return NextResponse.redirect(new URL("/dashboard/login?error=forbidden", request.url));
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
