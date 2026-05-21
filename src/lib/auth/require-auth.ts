import "server-only";

import { getSession } from "./session";
import { enterRequestContext } from "@/lib/request-context";

/**
 * Asserts that the current request is authenticated.
 *
 * Resolves the database-backed session (`hc_session` cookie). Throws a clear
 * 401-style error when no valid session exists.
 *
 * Use this at the top of any Server Action that requires an authenticated user
 * (but not necessarily an admin).
 */
export async function requireAuth(): Promise<{
  userId: string;
  walletAddress?: string;
}> {
  const session = await getSession();
  if (!session) {
    throw new Error("Authentication required. Please log in.");
  }

  // Propagate the real user id into the request context for logging/tracing.
  enterRequestContext({
    requestId: crypto.randomUUID(),
    userId: session.userId,
  });

  return {
    userId: session.userId,
    ...(session.walletAddress ? { walletAddress: session.walletAddress } : {}),
  };
}
