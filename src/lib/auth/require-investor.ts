import "server-only";

import { redirect } from "next/navigation";

import { getSession, type SessionUser } from "./session";
import { enterRequestContext } from "@/lib/request-context";

/**
 * Asserts that the current request is authenticated as an investor and renders
 * the investor product surface.
 *
 * The two universes (investor / admin) are intentionally watertight in BOTH
 * directions:
 *   - No / invalid session → redirect to /login?from=<path> (must sign in).
 *   - role === "admin"      → redirect to /admin. An admin landing on an
 *     investor route is sent back to their own zone — this is not a 404,
 *     because /admin is a legitimate destination for them.
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

  if (session.role === "admin") {
    redirect("/admin");
  }

  // Propagate the real user id into the request context for logging/tracing.
  enterRequestContext({
    requestId: crypto.randomUUID(),
    userId: session.userId,
  });

  return session;
}
