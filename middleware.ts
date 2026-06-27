import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const passwordEnabled = Boolean(process.env.ADMIN_PASSWORD);
  const isLogin = request.nextUrl.pathname === "/dashboard/login";
  const hasSession = request.cookies.get("dashboard_session")?.value === "active";

  if (!passwordEnabled || isLogin || hasSession) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/dashboard/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
