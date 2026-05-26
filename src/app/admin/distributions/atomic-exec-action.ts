"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/require-admin";
import { recordAdminAudit } from "@/lib/admin/audit";
import { assertRateLimit } from "@/lib/rate-limit";
import {
  executeDistributionAtomically,
  type AtomicExecResult,
} from "@/lib/distribution/atomic-exec";

/** Rate limit: 5 atomic-exec calls per admin per 60s (heavy operation). */
const EXEC_RATE_MAX = 5;
const EXEC_RATE_WINDOW_MS = 60_000;

export interface AtomicExecActionResult {
  success: true;
  result: AtomicExecResult;
}

export interface AtomicExecActionError {
  success: false;
  error: string;
}

export type AtomicExecActionResponse =
  | AtomicExecActionResult
  | AtomicExecActionError;

export async function atomicExecAction(
  distributionId: string,
): Promise<AtomicExecActionResponse> {
  const admin = await requireAdmin();

  try {
    await assertRateLimit(
      `admin:atomic-exec:${admin.userId}`,
      EXEC_RATE_MAX,
      EXEC_RATE_WINDOW_MS,
    );
  } catch {
    return { success: false, error: "Too many requests. Please wait." };
  }

  try {
    const result = await executeDistributionAtomically(distributionId);

    await recordAdminAudit({
      actorWallet: admin.walletAddress ?? admin.userId,
      action: "distribution.atomic-exec",
      entityType: "Distribution",
      entityId: distributionId,
      before: null,
      after: {
        txHash: result.tx.hash,
        ledgerEntriesCount: result.ledgerEntries.length,
        emailsQueued: result.emailsQueued,
      },
    });

    revalidatePath("/admin/distributions");

    return { success: true, result };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Atomic execution failed.",
    };
  }
}
