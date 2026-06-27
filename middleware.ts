import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStoreAdminEmail } from "@/lib/store-admin";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const authEnabled = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);
  const isLogin = request.nextUrl.pathname === "/dashboard/login";
  const hasSession = request.cookies.get("dashboard_session")?.value === "active";

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

  if (isLogin && isGoogleStoreAdmin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!authEnabled || isLogin || hasSession || isGoogleStoreAdmin) {
    return response;
  }

  const loginUrl = new URL("/dashboard/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
