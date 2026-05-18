import "server-only";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Idempotency guard for cron jobs and long-running operations.
 *
 * Prevents duplicate execution when a function is retried or replayed.
 * Uses the database as the single source of truth.
 *
 * Pattern:
 *   const key = buildIdempotencyKey("mining-health-daily", new Date());
 *   if (await isDuplicate(key)) { return cachedResult; }
 *   const result = await run(...);
 *   await markComplete(key, result);
 */

const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function buildKeyPrefix(jobId: string, date: Date): string {
  const d = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `${jobId}:${d}`;
}

/**
 * Checks whether this exact job+day combination has already succeeded.
 */
export async function isDuplicate(jobId: string, date: Date): Promise<boolean> {
  const key = buildKeyPrefix(jobId, date);
  const existing = await prisma.llmRun.findFirst({
    where: {
      agentName: jobId,
      status: "success",
      createdAt: {
        gte: new Date(date.getTime() - IDEMPOTENCY_WINDOW_MS),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    logger.info("idempotency: skipping duplicate job", {
      jobId,
      key,
      previousRunId: existing.id,
    });
    return true;
  }

  return false;
}

/**
 * Records the completion of an idempotent operation.
 * For non-LLM jobs we still write a lightweight row into LlmRun
 * because it is our generic execution-audit table.
 */
export async function markComplete(
  jobId: string,
  date: Date,
  meta?: { latencyMs?: number; costUsd?: number },
): Promise<void> {
  const key = buildKeyPrefix(jobId, date);
  await prisma.llmRun.create({
    data: {
      agentName: jobId,
      model: "n/a",
      status: "success",
      latencyMs: meta?.latencyMs ?? 0,
      costUsd: meta?.costUsd ?? 0,
    },
  });
  logger.info("idempotency: marked complete", { jobId, key });
}
