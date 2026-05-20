/**
 * Authentication gate for protected routes + request ID propagation.
 *
 * Runs in the Edge runtime. Uses `jose` (JWKS-based) for cryptographic JWT
 * verification against Privy's public key set — no Node.js crypto module
 * required, no PRIVY_APP_SECRET needed at the edge.
 *
 * Degraded mode (local dev / Privy not configured):
 *   When NEXT_PUBLIC_PRIVY_APP_ID is absent or empty, the gate is disabled
 *   and every route remains open. JWT signature cannot be verified without
 *   knowing the intended audience, so we skip the check entirely in this mode.
 *
 * When Privy IS configured:
 *   Protected routes require a valid `privy-token` cookie whose JWT signature
 *   is verified against https://auth.privy.io/api/v1/jwks.
 *   /admin/* additionally requires the verified wallet to be in ADMIN_ADDRESSES.
 *
 * Every request receives an `x-request-id` header for distributed tracing.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { safeFrom } from "@/lib/safe-redirect";

// ---------------------------------------------------------------------------
// JWKS — Privy's public key set, fetched and cached by jose at the edge.
// ---------------------------------------------------------------------------
const PRIVY_JWKS_URL = "https://auth.privy.io/api/v1/jwks";
const getPrivyJWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));

// ---------------------------------------------------------------------------
// Request ID
// ---------------------------------------------------------------------------

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/** Read ADMIN_ADDRESSES from process.env (edge-safe, no server-only modules). */
function getAdminAddresses(): string[] {
  const raw = process.env.ADMIN_ADDRESSES ?? "";
  return raw
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Extract the wallet address from a verified Privy JWT payload.
 *
 * Privy embeds the wallet in a custom claim. The exact shape depends on the
 * app's linked-accounts configuration. We probe common locations defensively.
 */
function extractWallet(payload: JWTPayload): string | undefined {
  if (typeof payload["walletAddress"] === "string") {
    return payload["walletAddress"];
  }
  const wallet = payload["wallet"];
  if (
    wallet !== null &&
    typeof wallet === "object" &&
    !Array.isArray(wallet) &&
    typeof (wallet as Record<string, unknown>)["address"] === "string"
  ) {
    return (wallet as Record<string, unknown>)["address"] as string;
  }
  return undefined;
}

/** Returns true when `address` is in the admin whitelist. */
function isAdmin(address: string | undefined): boolean {
  if (!address) return false;
  const admins = getAdminAddresses();
  // If the env var is not set we are in dev / unconfigured mode — deny all.
  if (admins.length === 0) return false;
  return admins.includes(address.toLowerCase());
}

// ---------------------------------------------------------------------------
// JWT verification
// ---------------------------------------------------------------------------

interface VerifyResult {
  ok: boolean;
  wallet?: string;
}

/**
 * Verify a Privy JWT from the request cookie via JWKS signature check.
 *
 * Returns `{ ok: true, wallet }` on success, `{ ok: false }` otherwise.
 * Pure edge-safe: only `jose` + `process.env`, no Node APIs.
 */
async function verifyPrivyToken(req: NextRequest): Promise<VerifyResult> {
  const token = req.cookies.get("privy-token")?.value;
  if (!token) return { ok: false };

  try {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const { payload } = await jwtVerify(token, getPrivyJWKS, {
      issuer: "privy.io",
      ...(appId ? { audience: appId } : {}),
    });
    return { ok: true, wallet: extractWallet(payload) };
  } catch {
    // Invalid signature, expired token, wrong issuer/audience.
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Redirect helpers
// ---------------------------------------------------------------------------

/**
 * Build a redirect to `/login` carrying the original path in `?from=` so the
 * login page can route the user back after successful authentication.
 * The `from` value is whitelisted via `safeFrom` to prevent open-redirect.
 */
function loginRedirect(req: NextRequest): NextResponse {
  const target = new URL("/login", req.url);
  const raw = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  target.searchParams.set("from", safeFrom(raw));
  return NextResponse.redirect(target);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // --- 1. Request ID propagation (tracing) ----------------------------------
  const requestHeaders = new Headers(request.headers);
  if (!requestHeaders.get("x-request-id")) {
    requestHeaders.set("x-request-id", generateRequestId());
  }

  const next = (headers: Headers = requestHeaders): NextResponse =>
    NextResponse.next({ request: { headers } });

  // --- 2. Degraded mode: Privy not configured --------------------------------
  // Without NEXT_PUBLIC_PRIVY_APP_ID we cannot set the `audience` claim and
  // should not verify tokens — let all routes through for local development.
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId || appId.length === 0) {
    return next();
  }

  const { pathname } = request.nextUrl;

  // --- 3. Admin gate: /admin/* ----------------------------------------------
  // Requires a valid JWT + wallet in ADMIN_ADDRESSES.
  if (pathname.startsWith("/admin")) {
    const { ok, wallet } = await verifyPrivyToken(request);

    if (!ok) {
      return loginRedirect(request);
    }

    if (!isAdmin(wallet)) {
      // Rewrite to /not-found so Next.js renders its global 404 page (status
      // 404) without exposing that the admin area exists.
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    return next();
  }

  // --- 4. Investor gate: product routes -------------------------------------
  // Any authenticated Privy user may access these routes.
  const { ok } = await verifyPrivyToken(request);

  if (!ok) {
    return loginRedirect(request);
  }

  return next();
}

// ---------------------------------------------------------------------------
// Route matcher
// Covers all protected routes; explicitly excludes API, Next internals,
// static assets, and common public files.
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/scenario-lab/:path*",
    "/proof-center/:path*",
    "/investor-memo/:path*",
    "/portfolio/:path*",
    "/vaults/:path*",
  ],
};
