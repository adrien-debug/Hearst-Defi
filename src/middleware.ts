/**
 * src/middleware.ts — Edge middleware guarding /admin/* and customer routes.
 *
 * Runs in the Edge runtime (no Node.js APIs). Uses `jose` for JWT
 * verification against Privy's public JWKS endpoint so we never need
 * the PRIVY_APP_SECRET or any Node crypto module here.
 *
 * Flow — /admin/* :
 *  1. Request matches /admin/* → read `privy-token` cookie.
 *  2. No cookie / invalid JWT → redirect to `/` (unauthenticated).
 *  3. JWT valid but wallet not in ADMIN_ADDRESSES → rewrite to `/not-found`
 *     (Next.js serves its global 404 page — returns 404 to the client).
 *  4. JWT valid + admin → let the request through.
 *
 * Flow — /portfolio/* | /vaults/* | /activity/* :
 *  1. No cookie / invalid JWT → redirect to `/?login=true&from=<path>`.
 *  2. JWT valid (any authenticated Privy user) → let the request through.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// ---------------------------------------------------------------------------
// JWKS — Privy's public key set, fetched and cached by jose at the edge.
// ---------------------------------------------------------------------------
const PRIVY_JWKS_URL = "https://auth.privy.io/api/v1/jwks";
const getPrivyJWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));

// ---------------------------------------------------------------------------
// Helpers
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
  // Privy sometimes embeds `walletAddress` directly on the payload.
  if (typeof payload["walletAddress"] === "string") {
    return payload["walletAddress"];
  }
  // Alternatively under a nested `wallet` object.
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
// Core JWT verification — shared by both branches
// ---------------------------------------------------------------------------

interface VerifyResult {
  ok: boolean;
  wallet?: string;
}

/**
 * Verify a Privy JWT from the request cookie.
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
 * Build a redirect URL to `/` that carries the original path in `?from=` so
 * the home page can route the user back after successful login.
 *
 * The `from` value is whitelisted to absolute, same-origin paths to prevent
 * open-redirect on third-party domains.
 */
function loginRedirect(req: NextRequest): NextResponse {
  const target = new URL("/", req.url);
  const from = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (from.startsWith("/") && !from.startsWith("//")) {
    target.searchParams.set("login", "true");
    target.searchParams.set("from", from);
  }
  return NextResponse.redirect(target);
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // ------------------------------------------------------------------
  // Branch A — /admin/*
  // Requires a valid Privy JWT whose wallet is in ADMIN_ADDRESSES.
  // ------------------------------------------------------------------
  if (pathname.startsWith("/admin")) {
    const { ok, wallet } = await verifyPrivyToken(req);

    if (!ok) {
      return loginRedirect(req);
    }

    if (!isAdmin(wallet)) {
      // Rewrite to /not-found so Next.js renders its global 404 page (status 404)
      // without exposing the fact that the admin area exists.
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }

    return NextResponse.next();
  }

  // ------------------------------------------------------------------
  // Branch B — /portfolio/* | /vaults/* | /activity/*
  // Requires any valid Privy JWT (authenticated investor).
  // ------------------------------------------------------------------
  const { ok } = await verifyPrivyToken(req);

  if (!ok) {
    return loginRedirect(req);
  }

  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Route matcher — /admin/* and customer-facing authenticated routes.
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    "/admin/:path*",
    "/portfolio/:path*",
    "/vaults/:path*",
    "/activity/:path*",
  ],
};
