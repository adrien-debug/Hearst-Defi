import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Authentication gate for protected routes + request ID propagation.
 *
 * When Privy is not configured (local dev), the gate is disabled and every
 * route remains open — matching the degraded-mode contract from CLAUDE.md.
 *
 * When Privy IS configured, we require the `privy-token` cookie. The JWT
 * signature verification is delegated to server components / server actions
 * (PrivyClient needs Node crypto, which is not fully available in the Edge
 * runtime on all platforms). The middleware therefore acts as a fast
 * first-line defence; pages perform the cryptographic check themselves.
 *
 * Every request gets a `x-request-id` header for distributed tracing.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/scenario-lab",
  "/investor-memo",
  "/proof-center",
  "/admin",
];

function isProtected(path: string): boolean {
  return PROTECTED_PREFIXES.some((p) =>
    path === p || path.startsWith(`${p}/`),
  );
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function middleware(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);

  // Propagate or generate request ID for distributed tracing
  const existingRequestId = requestHeaders.get("x-request-id");
  if (!existingRequestId) {
    requestHeaders.set("x-request-id", generateRequestId());
  }

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const secret = process.env.PRIVY_APP_SECRET;

  // Degraded mode: Privy not configured → gate disabled.
  if (!appId || appId.length === 0 || !secret || secret.length === 0) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!isProtected(request.nextUrl.pathname)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const token = request.cookies.get("privy-token")?.value;
  if (!token || token.length === 0) {
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("reason", "auth_required");
    return NextResponse.redirect(loginUrl);
  }

  // Attach the token to headers so Server Components can verify it
  // without reading the cookie themselves.
  requestHeaders.set("x-privy-token", token);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|logos|fonts|images).*)",
  ],
};
