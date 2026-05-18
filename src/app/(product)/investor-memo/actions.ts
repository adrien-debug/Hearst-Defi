"use server";

import { runInvestorMemo } from "@/lib/agents/investor-memo";
import { loadMemoInput } from "@/lib/agents/loaders/vault";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";
import { requireAuth } from "@/lib/auth/require-auth";
import { assertRateLimit } from "@/lib/rate-limit";

/**
 * Generates an investor memo via the Opus 4.7 agent using live vault data.
 *
 * Rate limited to 5 calls per minute per user.
 */
export async function generateMemoAction(): Promise<InvestorMemoOutput> {
  const { userId } = await requireAuth();
  await assertRateLimit(`generate-memo:${userId}`, 5, 60_000);
  const input = await loadMemoInput();
  return runInvestorMemo(input);
}
