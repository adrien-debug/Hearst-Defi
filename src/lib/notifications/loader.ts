import "server-only";

import { prisma } from "@/lib/db";
import type { Notification, NotificationsPayload } from "./types";

/**
 * Load notifications for a user.
 *
 * - unread: not archived, not permanently snoozed past now()
 * - archived: explicitly archived rows (newest first, capped at 50)
 *
 * Snoozed items re-surface automatically once snoozedUntil <= now().
 */
export async function loadUserNotifications(
  userId: string,
): Promise<NotificationsPayload> {
  const now = new Date();

  const [unreadRows, archivedRows] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        archivedAt: null,
        // Re-surface snoozed items whose snooze window has expired.
        OR: [
          { snoozedUntil: null },
          { snoozedUntil: { lte: now } },
        ],
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    }),
    prisma.notification.findMany({
      where: {
        userId,
        archivedAt: { not: null },
      },
      orderBy: { archivedAt: "desc" },
      take: 50,
    }),
  ]);

  return {
    unread: unreadRows as Notification[],
    archived: archivedRows as Notification[],
  };
}
