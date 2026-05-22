import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/require-auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/cockpit-chats/[id] — delete a single conversation.
 *
 * Consumed by `@hearst/cockpit-shell`'s ChatHistory (per-row trash button).
 * Isolation: the delete is scoped to `{ id, userId }`, so a user can never
 * delete someone else's conversation even by guessing an id. A miss (wrong
 * owner or unknown id) returns 404, not 403, to avoid leaking existence.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  let userId: string;
  try {
    ({ userId } = await requireAuth());
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Scope the delete to the owner — cascade removes the chat's messages.
  const { count } = await prisma.cockpitChat.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  logger.info("cockpit chat deleted", { userId, chatId: id });
  return NextResponse.json({ ok: true });
}
