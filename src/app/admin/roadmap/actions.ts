"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { safeUrl } from "@/lib/safe-url";
import type { RoadmapStatus } from "@/lib/roadmap-types";

// Field length caps (defensive — UI textareas are already bounded by these)
const MAX_NOTES = 2000;
const MAX_BLOCKERS = 1000;
const MAX_VALIDATED_BY = 200;

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

    // evidenceUrl: must be empty OR a safe http(s) URL
    const rawEvidenceUrl = asString(formData.get("evidenceUrl"));
    const evidenceUrl = rawEvidenceUrl !== null
      ? (rawEvidenceUrl.toLowerCase().startsWith("https://") ||
         rawEvidenceUrl.toLowerCase().startsWith("http://")
          ? safeUrl(rawEvidenceUrl) || null
          : null)
      : null;
    if (rawEvidenceUrl !== null && evidenceUrl === null) {
      throw new Error("Evidence URL must be a valid https:// or http:// URL.");
    }

    // Length-bounded fields
    const notes = asString(
      typeof formData.get("notes") === "string"
        ? (formData.get("notes") as string).slice(0, MAX_NOTES)
        : formData.get("notes"),
    );
    const blockers = asString(
      typeof formData.get("blockers") === "string"
        ? (formData.get("blockers") as string).slice(0, MAX_BLOCKERS)
        : formData.get("blockers"),
    );
    const validatedBy = asString(
      typeof formData.get("validatedBy") === "string"
        ? (formData.get("validatedBy") as string).slice(0, MAX_VALIDATED_BY)
        : formData.get("validatedBy"),
    );

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
