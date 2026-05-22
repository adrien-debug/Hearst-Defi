import "server-only";

import { redirect } from "next/navigation";

import { getSession, type SessionUser } from "./session";
import { enterRequestContext } from "@/lib/request-context";

/**
 * Asserts that the current request is authenticated, then renders the investor
 * product surface.
 *
 * Access rules:
 *   - No / invalid session → redirect to /login?from=<path> (must sign in).
 *   - role === "admin"      → allowed through. Admin ⊇ investor: an admin (e.g.
 *     the head of product reviewing the platform A→Z) can browse the investor
 *     surfaces in addition to /admin. The hard boundary remains one-directional
 *     — `requireAdmin()` still blocks investors from /admin.
 *   - role === "investor"   → allowed through.
 *
 * Use at the top of the (product) layout. The edge proxy can only check cookie
 * PRESENCE, not the role, so this is the authoritative investor gate.
 */
export async function requireInvestor(from: string): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    redirect(`/login?from=${encodeURIComponent(from)}`);
  }

  // Propagate the real user id into the request context for logging/tracing.
  enterRequestContext({
    requestId: crypto.randomUUID(),
    userId: session.userId,
  });

  return session;
}
