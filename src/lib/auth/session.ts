import "server-only";

import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// JWKS — Privy's public key set, fetched and cached lazily (Node runtime only).
// ---------------------------------------------------------------------------

const PRIVY_JWKS_URL = "https://auth.privy.io/api/v1/jwks";
const PRIVY_ISSUER = "privy.io";

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!JWKS) JWKS = createRemoteJWKSet(new URL(PRIVY_JWKS_URL));
  return JWKS;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionUser {
  /** Privy DID — e.g. "did:privy:abc123" */
  userId: string;
  /** Primary embedded wallet address, or null if none present in the token. */
  walletAddress: string | null;
}

// ---------------------------------------------------------------------------
// Wallet extraction — mirrors the pattern in middleware.ts
// ---------------------------------------------------------------------------

/**
 * Probe common Privy JWT claim shapes for an EVM wallet address.
 *
 * NOTE: Privy does NOT always embed `walletAddress` at the top level of the
 * JWT payload. The field is present only when the user has a single embedded
 * wallet selected as primary. For users whose wallet lives in `linked_accounts`
 * (e.g. external connectors), the payload claim may be absent.
 *
 * Out-of-scope for S2: resolving `linked_accounts` via the Privy Server SDK
 * (`PrivyClient.getUser(did)`). If `walletAddress` is null here and the
 * caller needs the full wallet list, call `verifyAuthToken` from `./verify`
 * which uses the SDK and can access linked accounts.
 */
function extractWalletAddress(
  payload: Record<string, unknown>,
): string | null {
  // Shape 1 — top-level `walletAddress` claim (snake_case variant).
  if (typeof payload["wallet_address"] === "string") {
    return payload["wallet_address"];
  }
  // Shape 2 — top-level camelCase (observed in some Privy app configurations).
  if (typeof payload["walletAddress"] === "string") {
    return payload["walletAddress"];
  }
  // Shape 3 — nested `wallet.address` object.
  const wallet = payload["wallet"];
  if (
    wallet !== null &&
    typeof wallet === "object" &&
    !Array.isArray(wallet) &&
    typeof (wallet as Record<string, unknown>)["address"] === "string"
  ) {
    return (wallet as Record<string, unknown>)["address"] as string;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Reads and verifies the Privy session cookie using jose + JWKS.
 *
 * Server-side only. Returns null when the cookie is absent or the token fails
 * signature / issuer / audience checks. Does NOT call Prisma.
 *
 * Edge-incompatible: relies on Node crypto (via `jose` remote JWKS fetch) and
 * `next/headers`. Use only in RSC, Server Actions, or Route Handlers — NOT in
 * `middleware.ts` (which already does its own lightweight verification).
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get("privy-token")?.value;
  if (!token) return null;

  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return null;

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: PRIVY_ISSUER,
      audience: appId,
    });

    const userId =
      typeof payload.sub === "string" && payload.sub.length > 0
        ? payload.sub
        : null;
    if (!userId) return null;

    const walletAddress = extractWalletAddress(
      payload as Record<string, unknown>,
    );

    return { userId, walletAddress };
  } catch {
    // Invalid signature, expired token, wrong issuer/audience — treat as unauthenticated.
    return null;
  }
}

/**
 * Resolves (and lazily creates) the `Investor` row for the authenticated user.
 *
 * - If no valid session exists → returns null.
 * - If a session exists but no `Investor` row → creates one **only when a
 *   walletAddress is present in the JWT payload** (first-visit upsert).
 * - If `walletAddress` is null and no row exists → returns null (incomplete
 *   profile; caller should prompt wallet connection).
 */
export async function getInvestor() {
  const session = await getSession();
  if (!session) return null;

  let investor = await prisma.investor.findUnique({
    where: { userId: session.userId },
  });

  if (!investor && session.walletAddress) {
    investor = await prisma.investor.create({
      data: {
        userId: session.userId,
        walletAddress: session.walletAddress.toLowerCase(),
      },
    });
  }

  return investor;
}

/**
 * Strict variant of `getSession`. Throws when no valid session is found.
 *
 * Use inside Server Actions that are gated behind authentication.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new Error("Authentication required");
  return session;
}
