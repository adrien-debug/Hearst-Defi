import { NextRequest, NextResponse } from "next/server";

import { buildSearchIndex } from "@/lib/search/indexer";
import { type SearchApiResponse } from "@/lib/search/types";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 *
 * Admin-only route. Requires an active session with role=admin.
 * Non-admin or unauthenticated callers receive 401/403 before any index is built.
 *
 * Returns up to MAX_PER_SECTION results per entity across 10 entity types.
 * Detects direct-jump patterns (Ethereum address / tx hash / id prefix)
 * and returns directJump=true + directHref for immediate client redirect.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<SearchApiResponse | { error: string }>> {
  // Admin gate — this route exposes investor PII (walletAddress, email, kycStatus).
  // The proxy only checks cookie presence; role enforcement must happen here.
  try {
    await requireAdmin();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unauthorized";
    const isAuthRequired = message.toLowerCase().includes("authentication required");
    return NextResponse.json(
      { error: message },
      { status: isAuthRequired ? 401 : 403 },
    );
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";

  if (q.length > 200) {
    return NextResponse.json(
      { results: [], query: q.slice(0, 200), directJump: false },
      { status: 400 },
    );
  }

  try {
    const response = await buildSearchIndex(q);
    return NextResponse.json(response);
  } catch (err) {
    // Surface as 500 — the caller handles it gracefully
    console.error("[search/route] indexer error:", err);
    return NextResponse.json(
      { results: [], query: q, directJump: false },
      { status: 500 },
    );
  }
}
