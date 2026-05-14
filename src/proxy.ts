import { type NextRequest, NextResponse } from "next/server";

/**
 * Routes inside the `(product)` route group are gated behind Privy auth.
 * The admin console (`/admin/*`) and the homepage stay public.
 *
 * The proxy checks for the presence of Privy's session cookies; the
 * cryptographic validity of the identity token is re-checked on the client
 * (Privy hooks) and can be re-checked server-side via `@privy-io/server-auth`
 * inside Server Components or API routes when we need a verified user.
 *
 * Cookie names come from the Privy React SDK constants (see
 * `node_modules/@privy-io/react-auth/dist/esm/context-*.mjs`):
 *   - `privy-token`        — access token (short-lived)
 *   - `privy-id-token`     — identity token (the one we verify server-side)
 *   - `privy-refresh-token`— refresh token
 *
 * We accept any one of these as a "looks logged in" signal at the edge.
 *
 * Renamed from `middleware.ts` → `proxy.ts` for Next 16 (the `middleware`
 * file convention is deprecated; see
 * https://nextjs.org/docs/messages/middleware-to-proxy).
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scenario-lab",
  "/proof-center",
  "/investor-memo",
] as const;

const PRIVY_COOKIE_NAMES = [
  "privy-token",
  "privy-id-token",
  "privy-refresh-token",
] as const;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!isProtected) return NextResponse.next();

  // Dev fallback: no Privy app id configured → app is "auth-disabled".
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) return NextResponse.next();

  const hasPrivySession = PRIVY_COOKIE_NAMES.some(
    (name) => (request.cookies.get(name)?.value ?? "").length > 0,
  );
  if (hasPrivySession) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("login", "true");
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/scenario-lab/:path*",
    "/proof-center/:path*",
    "/investor-memo/:path*",
  ],
};
