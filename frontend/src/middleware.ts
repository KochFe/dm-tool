import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for the auth cookie flag (set by setTokens in api.ts)
  const hasToken = request.cookies.get("has_token");
  if (!hasToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Prevent Next.js from caching auth-dependent responses —
  // without this, a cached redirect persists even after login
  const response = NextResponse.next();
  response.headers.set("x-middleware-cache", "no-cache");
  return response;
}

export const config = {
  // Only run middleware on app routes, not on static files or API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
