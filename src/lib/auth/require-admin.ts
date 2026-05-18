import "server-only";

import { cookies } from "next/headers";

import { isAdmin, verifyAuthToken } from "./verify";
import { withRequestContext } from "@/lib/request-context";

/**
 * Asserts that the current request is authenticated as an admin.
 *
 * Reads the `privy-token` cookie, verifies the JWT signature, and checks
 * that the wallet address is in the admin whitelist.
 *
 * Throws a clear 401/403 error if any step fails. Use this at the top of
 * every admin Server Action.
 */
export async function requireAdmin(): Promise<{ userId: string; walletAddress?: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("privy-token")?.value;

  if (!token) {
    throw new Error("Authentication required. Please log in.");
  }

  const user = await verifyAuthToken(token);
  if (!user) {
    throw new Error("Invalid or expired session. Please log in again.");
  }

  if (!isAdmin(user.walletAddress)) {
    throw new Error("Admin access required.");
  }

  // Propagate user ID into the request context for logging
  await withRequestContext(
    { requestId: crypto.randomUUID(), userId: user.walletAddress ?? user.userId },
    async () => {},
  );

  return user;
}
