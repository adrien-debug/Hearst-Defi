import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { assertRateLimit, assertBodySize } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin routes are heavily rate-limited: 20 requests / 60s / admin. */
const ADMIN_RATE_MAX = 20;
const ADMIN_RATE_WINDOW_MS = 60_000;

const BodySchema = z.object({
  mode: z.enum(["normal", "review"]),
});

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Admin access required" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/** Current chat mode for the authenticated admin. Defaults to "normal". */
export async function GET(): Promise<Response> {
  let userId: string;
  try {
    ({ userId } = await requireAdmin());
  } catch {
    return unauthorized();
  }

  try {
    await assertRateLimit(`admin:review-mode:${userId}`, ADMIN_RATE_MAX, ADMIN_RATE_WINDOW_MS);
  } catch {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const row = await prisma.adminChatMode.findUnique({
    where: { userId },
    select: { mode: true },
  });

  return Response.json({ mode: row?.mode === "review" ? "review" : "normal" });
}

/** Sets the chat mode (normal | review) for the authenticated admin. */
export async function POST(req: NextRequest): Promise<Response> {
  // 0. Body size guard — prevent DoS via oversized payloads.
  try {
    await assertBodySize(req);
  } catch (sizeErr) {
    return new Response(
      JSON.stringify({
        error: sizeErr instanceof Error ? sizeErr.message : "Request too large",
      }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  let userId: string;
  try {
    ({ userId } = await requireAdmin());
  } catch {
    return unauthorized();
  }

  try {
    await assertRateLimit(`admin:review-mode:${userId}`, ADMIN_RATE_MAX, ADMIN_RATE_WINDOW_MS);
  } catch {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    body = parsed.data;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await prisma.adminChatMode.upsert({
      where: { userId },
      update: { mode: body.mode },
      create: { userId, mode: body.mode },
    });
  } catch (err) {
    logger.error(
      "review-mode upsert failed",
      { userId },
      err instanceof Error ? err : undefined,
    );
    return new Response(JSON.stringify({ error: "Could not save mode" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Response.json({ mode: body.mode });
}
