"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { safeUrl } from "@/lib/safe-url";
import { assertRateLimit } from "@/lib/rate-limit";
import type { RoadmapStatus } from "@/lib/roadmap-types";

/** Admin roadmap actions rate limit: 30 requests / 60s / admin. */
const ROADMAP_RATE_MAX = 30;
const ROADMAP_RATE_WINDOW_MS = 60_000;

// Field length caps (defensive — UI textareas are already bounded by these)
const MAX_NOTES = 2000;
const MAX_BLOCKERS = 1000;
const MAX_VALIDATED_BY = 200;

const StatusEnum = z.enum(["todo", "in_progress", "done", "blocked", "validated"]);

const UpdateRoadmapSchema = z.object({
  itemId: z.string().min(1).max(200),
  status: StatusEnum,
  evidenceUrl: z.string().max(2048).optional().nullable(),
  notes: z.string().max(MAX_NOTES).optional().nullable(),
  blockers: z.string().max(MAX_BLOCKERS).optional().nullable(),
  validatedBy: z.string().max(MAX_VALIDATED_BY).optional().nullable(),
});

const QuickSetStatusSchema = z.object({
  itemId: z.string().min(1).max(200),
  status: StatusEnum,
});

/**
 * Validate and sanitize an evidence URL.
 * Returns null for empty/invalid URLs, throws for malformed URLs.
 */
function validateEvidenceUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  const lower = trimmed.toLowerCase();
  if (!lower.startsWith("https://") && !lower.startsWith("http://")) {
    throw new Error("Evidence URL must be a valid https:// or http:// URL.");
  }
  const safe = safeUrl(trimmed);
  if (!safe) {
    throw new Error("Evidence URL must be a valid https:// or http:// URL.");
  }
  return safe;
}

export async function updateRoadmapItem(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  try {
    await assertRateLimit(
      `admin:roadmap:${admin.userId}`,
      ROADMAP_RATE_MAX,
      ROADMAP_RATE_WINDOW_MS,
    );
  } catch {
    throw new Error("Too many requests");
  }

  try {
    // Extract and validate all fields with Zod
    const raw = Object.fromEntries(formData.entries());
    const parsed = UpdateRoadmapSchema.safeParse({
      itemId: raw.itemId,
      status: raw.status,
      evidenceUrl: raw.evidenceUrl ?? null,
      notes: raw.notes ?? null,
      blockers: raw.blockers ?? null,
      validatedBy: raw.validatedBy ?? null,
    });

    if (!parsed.success) {
      throw new Error(`Invalid input: ${parsed.error.message}`);
    }

    const { itemId, status, evidenceUrl: rawEvidenceUrl, notes, blockers, validatedBy } = parsed.data;

    // Validate evidence URL separately (needs safeUrl helper)
    const evidenceUrl = validateEvidenceUrl(rawEvidenceUrl);

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
  const admin = await requireAdmin();

  try {
    await assertRateLimit(
      `admin:roadmap:${admin.userId}`,
      ROADMAP_RATE_MAX,
      ROADMAP_RATE_WINDOW_MS,
    );
  } catch {
    throw new Error("Too many requests");
  }

  try {
    const parsed = QuickSetStatusSchema.safeParse({ itemId, status });
    if (!parsed.success) {
      throw new Error(`Invalid input: ${parsed.error.message}`);
    }

    const { itemId: validItemId, status: validStatus } = parsed.data;

    await prisma.roadmapValidation.upsert({
      where: { itemId: validItemId },
      create: {
        itemId: validItemId,
        status: validStatus,
        validatedAt: validStatus === "validated" ? new Date() : null,
      },
      update: {
        status: validStatus,
        validatedAt: validStatus === "validated" ? new Date() : null,
      },
    });
    revalidatePath("/admin/roadmap");
  } catch (err) {
    logger.error("quickSetStatus failed", { itemId }, err);
    throw err;
  }
}
