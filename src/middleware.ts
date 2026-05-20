/**
 * src/middleware.ts — Edge middleware guarding /admin/* routes.
 *
 * Runs in the Edge runtime (no Node.js APIs). Uses `jose` for JWT
 * verification against Privy's public JWKS endpoint so we never need
 * the PRIVY_APP_SECRET or any Node crypto module here.
 *
 * Flow:
 *  1. Request matches /admin/* → read `privy-token` cookie.
 *  2. No cookie → redirect to `/` (unauthenticated).
 *  3. JWT invalid / expired → redirect to `/` (bad session).
 *  4. JWT valid but wallet not in ADMIN_ADDRESSES → rewrite to `/not-found`
 *     (Next.js serves its global 404 page — returns 404 to the client).
 *  5. JWT valid + admin → let the request through.
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
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get("privy-token")?.value;

  // 1. No token → unauthenticated, redirect home.
  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 2. Verify the JWT signature against Privy's JWKS.
  let payload: JWTPayload;
  try {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const { payload: verified } = await jwtVerify(token, getPrivyJWKS, {
      issuer: "privy.io",
      ...(appId ? { audience: appId } : {}),
    });
    payload = verified;
  } catch {
    // Invalid signature, expired token, wrong issuer/audience.
    return NextResponse.redirect(new URL("/", req.url));
  }

  // 3. Check admin role.
  const wallet = extractWallet(payload);
  if (!isAdmin(wallet)) {
    // Rewrite to /not-found so Next.js renders its global 404 page (status 404)
    // without exposing the fact that the admin area exists.
    return NextResponse.rewrite(new URL("/not-found", req.url));
  }

  // 4. Authenticated admin — pass through.
  return NextResponse.next();
}

// ---------------------------------------------------------------------------
// Route matcher — only /admin/* paths, nothing else.
// ---------------------------------------------------------------------------
export const config = {
  matcher: ["/admin/:path*"],
};
