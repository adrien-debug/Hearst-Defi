import "server-only";

import { cookies } from "next/headers";

import { verifyAuthToken } from "./verify";
import { enterRequestContext } from "@/lib/request-context";

/**
 * Asserts that the current request is authenticated.
 *
 * Reads the `privy-token` cookie and verifies the JWT signature.
 * Throws a clear 401 error if authentication fails.
 *
 * Use this at the top of any Server Action that requires an authenticated
 * user (but not necessarily an admin).
 */
export async function requireAuth(): Promise<{ userId: string; walletAddress?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;

  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    throw new Error("Invalid or expired session. Please log in again.");
  }

  // Propagate user ID into the request context for logging
  enterRequestContext({ requestId: crypto.randomUUID(), userId: user.walletAddress ?? user.userId });

  return user;
}
