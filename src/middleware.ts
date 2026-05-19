import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Defense-in-depth gate for /admin/*.
 *
 * This is a coarse check (presence of the `privy-token` cookie) that runs
 * before the route. It does NOT replace `requireAdmin()` in each page — the
 * page-level guard remains the authoritative check (JWT verification + admin
 * whitelist). This only short-circuits obviously unauthenticated requests.
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get("privy-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
