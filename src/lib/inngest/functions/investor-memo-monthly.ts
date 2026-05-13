import "server-only";

import { inngest } from "@/lib/inngest/client";
import {
  runInvestorMemo,
  type InvestorMemoInput,
} from "@/lib/agents/investor-memo";
import { loadMemoInput } from "@/lib/agents/loaders/vault";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";

/**
 * Investor Memo Agent — monthly cron (1st of month at 09:00 UTC).
 *
 * Pipeline:
 *   1. load-memo-input → single Prisma read pulling vault snapshot, recent
 *                          persisted scenarios, and recent backtests.
 *   2. run-agent       → call Investor Memo Agent (Opus 4.7).
 *
 * Persistence to a `Report` row remains stubbed in this salvo (structured
 * console log only).
 */
export const INVESTOR_MEMO_MONTHLY_ID = "investor-memo-monthly" as const;
export const INVESTOR_MEMO_MONTHLY_CRON = "0 9 1 * *" as const;

export interface InvestorMemoMonthlyStep {
  run<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
}

export async function investorMemoMonthlyHandler({
  step,
}: {
  step: InvestorMemoMonthlyStep;
}): Promise<InvestorMemoOutput> {
  const input: InvestorMemoInput = await step.run("load-memo-input", () =>
    loadMemoInput(),
  );

  const result = await step.run("run-agent", () => runInvestorMemo(input));

  console.info("[memo-monthly] generated");
  return result;
}

export const investorMemoMonthly = inngest.createFunction(
  {
    id: INVESTOR_MEMO_MONTHLY_ID,
    triggers: [{ cron: INVESTOR_MEMO_MONTHLY_CRON }],
  },
  investorMemoMonthlyHandler,
);
