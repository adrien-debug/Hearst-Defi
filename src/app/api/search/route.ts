import { NextRequest, NextResponse } from "next/server";

import { buildSearchIndex } from "@/lib/search/indexer";
import { type SearchApiResponse } from "@/lib/search/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/search?q=<query>
 *
 * Returns up to MAX_PER_SECTION results per entity across 10 entity types.
 * Detects direct-jump patterns (Ethereum address / tx hash / id prefix)
 * and returns directJump=true + directHref for immediate client redirect.
 *
 * Rate-limiting: inherits the Next.js request limit; no custom rate limiter
 * here to keep the route self-contained. Authenticated routes handle auth at
 * the middleware/proxy layer.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<SearchApiResponse>> {
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
