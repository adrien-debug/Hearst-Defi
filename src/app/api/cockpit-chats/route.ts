import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { assertRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Conversation history for the Cockpit chat rail (Section 3).
 *
 * Consumed by `@hearst/cockpit-shell`'s ChatHistory component, which expects:
 *   GET    /api/cockpit-chats        → { chats: ChatSummary[] }
 *   DELETE /api/cockpit-chats        → wipe all of the user's chats
 *   DELETE /api/cockpit-chats/[id]   → delete one chat (see ./[id]/route.ts)
 *
 * ChatSummary shape (snake_case — the package's interface, not ours):
 *   { id, title, created_at, updated_at }
 *
 * Per-user isolation is enforced by closing over the verified `userId` from
 * requireAuth() — a user can only ever see or delete their own conversations.
 */

interface ChatSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

/** GET — list the authenticated user's conversations, most recent first. */
export async function GET(_req: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await assertRateLimit(`cockpit-chats:list:${userId}`, 60, 60_000);

  const rows = await prisma.cockpitChat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
    take: 100,
  });

  const chats: ChatSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title ?? "Nouvelle conversation",
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));

  return NextResponse.json({ chats });
}

/** DELETE — wipe every conversation belonging to the authenticated user. */
export async function DELETE(_req: NextRequest): Promise<NextResponse> {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await assertRateLimit(`cockpit-chats:clear:${userId}`, 10, 60_000);

  // onDelete: Cascade on CockpitMessage.chat removes the messages too.
  const { count } = await prisma.cockpitChat.deleteMany({ where: { userId } });
  logger.info("cockpit chats cleared", { userId, count });

  return NextResponse.json({ ok: true, count });
}
