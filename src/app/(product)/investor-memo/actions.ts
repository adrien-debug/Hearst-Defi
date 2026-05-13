"use server";

import { runInvestorMemo } from "@/lib/agents/investor-memo";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";
import { getMockMemoInput } from "@/lib/mock/investor-memo";

export async function generateMemoAction(): Promise<InvestorMemoOutput> {
  const input = getMockMemoInput();
  return runInvestorMemo(input);
}
