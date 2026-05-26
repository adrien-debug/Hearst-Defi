import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";

/**
 * Debug endpoint: returns the current session payload so an operator can
 * verify what the server sees about the caller.
 *
 * Returns:
 *   - 200 { userId, email, role, walletAddress } when authenticated
 *   - 200 { session: null } when no session cookie or session expired
 *
 * Never exposes sensitive data — only the same fields a Server Component
 * would already see via `getSession()`. No password hash, no other users.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      {
        session: null,
        hint: "No active session — the hc_session cookie is missing or its DB row has expired.",
      },
      { status: 200, headers: { "cache-control": "private, no-store" } },
    );
  }
  return NextResponse.json(
    {
      userId: session.userId,
      email: session.email,
      role: session.role,
      walletAddress: session.walletAddress,
    },
    { status: 200, headers: { "cache-control": "private, no-store" } },
  );
}
