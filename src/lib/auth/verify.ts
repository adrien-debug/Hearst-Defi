import "server-only";

import { PrivyClient } from "@privy-io/server-auth";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Server-side JWT verification for Privy tokens.
 *
 * This module performs the cryptographic signature check that the
 * Edge-runtime middleware cannot do (Node crypto required).
 *
 * Usage: call `verifyAuthToken(token)` inside a Server Component or
 * Server Action before serving protected data.
 */

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (!env.NEXT_PUBLIC_PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    return null;
  }
  if (!privyClient) {
    privyClient = new PrivyClient(
      env.NEXT_PUBLIC_PRIVY_APP_ID,
      env.PRIVY_APP_SECRET,
    );
  }
  return privyClient;
}

export interface VerifiedUser {
  userId: string;
  walletAddress?: string;
}

/** Narrows an unknown value to a plain string-keyed object. */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

/**
 * Verifies a Privy auth token.
 *
 * Returns the verified user when the token is valid.
 * Returns null when Privy is not configured (dev mode) or the token is invalid.
 */
export async function verifyAuthToken(
  token: string,
): Promise<VerifiedUser | null> {
  const client = getPrivyClient();
  if (!client) {
    // Privy not configured — dev degraded mode.
    return null;
  }

  try {
    const verified = await client.verifyAuthToken(token);
    if (!verified || !verified.userId) {
      return null;
    }
    // Extract wallet address from custom claims if available.
    // Privy token claims vary by integration; we safely probe for a wallet.
    const wallet =
      isRecord(verified) && typeof verified.walletAddress === "string"
        ? verified.walletAddress
        : undefined;

    return { userId: verified.userId, walletAddress: wallet };
  } catch (err) {
    logger.warn("auth verification failed", { error: String(err) });
    return null;
  }
}

/**
 * Checks whether the given wallet address is in the admin whitelist.
 */
export function isAdmin(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase();
  const admins = (env.ADMIN_ADDRESSES ?? "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(normalized);
}
