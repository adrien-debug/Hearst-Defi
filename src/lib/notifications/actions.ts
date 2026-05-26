"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const NotifIdSchema = z.string().cuid();

const SnoozeSchema = z.object({
  notifId: z.string().cuid(),
  until: z.coerce.date(),
});

async function revalidate() {
  revalidatePath("/admin", "layout");
}

export async function markAsRead(notifId: string): Promise<void> {
  const admin = await requireAdmin();

  const parsed = NotifIdSchema.safeParse(notifId);
  if (!parsed.success) throw new Error("Invalid notification id");

  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data, userId: admin.userId, readAt: null },
      data: { readAt: new Date() },
    });
    await revalidate();
  } catch (err) {
    logger.error("markAsRead failed", { notifId }, err);
    throw err;
  }
}

export async function markAllAsRead(): Promise<void> {
  const admin = await requireAdmin();

  try {
    await prisma.notification.updateMany({
      where: { userId: admin.userId, readAt: null, archivedAt: null },
      data: { readAt: new Date() },
    });
    await revalidate();
  } catch (err) {
    logger.error("markAllAsRead failed", {}, err);
    throw err;
  }
}

export async function archive(notifId: string): Promise<void> {
  const admin = await requireAdmin();

  const parsed = NotifIdSchema.safeParse(notifId);
  if (!parsed.success) throw new Error("Invalid notification id");

  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data, userId: admin.userId },
      data: { archivedAt: new Date() },
    });
    await revalidate();
  } catch (err) {
    logger.error("archive failed", { notifId }, err);
    throw err;
  }
}

export async function snooze(notifId: string, until: Date): Promise<void> {
  const admin = await requireAdmin();

  const parsed = SnoozeSchema.safeParse({ notifId, until });
  if (!parsed.success) throw new Error("Invalid snooze input");

  try {
    await prisma.notification.updateMany({
      where: { id: parsed.data.notifId, userId: admin.userId },
      data: { snoozedUntil: parsed.data.until },
    });
    await revalidate();
  } catch (err) {
    logger.error("snooze failed", { notifId }, err);
    throw err;
  }
}
