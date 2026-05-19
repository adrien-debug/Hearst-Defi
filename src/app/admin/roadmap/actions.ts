"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { RoadmapStatus } from "@/lib/roadmap-types";

const VALID_STATUS: RoadmapStatus[] = [
  "todo",
  "in_progress",
  "done",
  "blocked",
  "validated",
];

function parseStatus(value: FormDataEntryValue | null): RoadmapStatus | null {
  if (typeof value !== "string") return null;
  return VALID_STATUS.includes(value as RoadmapStatus)
    ? (value as RoadmapStatus)
    : null;
}

function asString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateRoadmapItem(formData: FormData): Promise<void> {
  await requireAdmin();

  try {
    const itemId = asString(formData.get("itemId"));
    if (!itemId) return;

    const status = parseStatus(formData.get("status"));
    if (!status) return;

    const evidenceUrl = asString(formData.get("evidenceUrl"));
    const notes = asString(formData.get("notes"));
    const blockers = asString(formData.get("blockers"));
    const validatedBy = asString(formData.get("validatedBy"));

    const validatedAt =
      status === "validated"
        ? new Date()
        : status === "done"
          ? null
          : null;

    await prisma.roadmapValidation.upsert({
      where: { itemId },
      create: {
        itemId,
        status,
        validatedBy: status === "validated" ? validatedBy : null,
        validatedAt,
        evidenceUrl,
        notes,
        blockers,
      },
      update: {
        status,
        validatedBy: status === "validated" ? validatedBy : null,
        validatedAt,
        evidenceUrl,
        notes,
        blockers,
      },
    });

    revalidatePath("/admin/roadmap");
  } catch (err) {
    logger.error("updateRoadmapItem failed", {}, err);
    throw err;
  }
}

export async function quickSetStatus(
  itemId: string,
  status: RoadmapStatus,
): Promise<void> {
  await requireAdmin();

  try {
    // Validate the status against the known enum before touching the DB.
    if (!VALID_STATUS.includes(status)) {
      throw new Error(`Invalid roadmap status: ${String(status)}`);
    }

    await prisma.roadmapValidation.upsert({
      where: { itemId },
      create: {
        itemId,
        status,
        validatedAt: status === "validated" ? new Date() : null,
      },
      update: {
        status,
        validatedAt: status === "validated" ? new Date() : null,
      },
    });
    revalidatePath("/admin/roadmap");
  } catch (err) {
    logger.error("quickSetStatus failed", { itemId }, err);
    throw err;
  }
}
