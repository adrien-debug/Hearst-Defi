import { describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

import { runInvestorMemo } from "@/lib/agents/investor-memo";
import { prisma } from "@/lib/db";
import type { InvestorMemoInput } from "@/lib/agents/investor-memo";

describe("Investor Memo integration", () => {
  it("generates a memo and persists a LlmRun record", async () => {
    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            executive_summary: "Under the assumption that hashprice remains stable, the vault targets 9–12% APY.",
            vault_structure: "Test structure.",
            scenario_analysis: "Under the assumption that BTC price holds, the scenario projects 10% APY range.",
            risk_section: "Test risk.",
            mining_section: "Under the assumption of stable energy costs, mining margins remain healthy.",
            performance_section: "Test performance.",
            methodology_note: "Test methodology.",
            disclaimer: "Test disclaimer.",
          }),
        },
      ],
      usage: { input_tokens: 500, output_tokens: 300 },
    };

    const mockClient = {
      messages: {
        create: vi.fn().mockResolvedValue(mockResponse),
      },
    };

    const input: InvestorMemoInput = {
      vault: {
        aumUsdc: 12_500_000,
        apyRange: { low: 9.2, high: 12.8 },
        mode: "balanced",
        riskScore: 38,
      },
      scenarios: [],
      backtests: [],
      generatedAt: new Date().toISOString(),
    };

    const result = await runInvestorMemo(input, { client: mockClient });

    expect(result.executive_summary).toContain("assumption");
    expect(mockClient.messages.create).toHaveBeenCalledTimes(1);

    // Verify LlmRun was persisted
    const runs = await prisma.llmRun.findMany({
      where: { agentName: "investor-memo" },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    expect(runs.length).toBe(1);
    const run = runs[0];
    expect(run).toBeDefined();
    if (run) {
      expect(run.status).toBe("success");
      expect(run.model).toContain("opus");
      expect(run.inputTokens).toBe(500);
      expect(run.outputTokens).toBe(300);
      expect(run.costUsd).toBeGreaterThan(0);
    }
  });

  it("retries on 429 and eventually succeeds", async () => {
    const mockResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            executive_summary: "Under the assumption that hashprice remains stable, this retry summary projects 9–12% APY.",
            vault_structure: "Retry structure.",
            scenario_analysis: "Under the assumption that BTC holds, the retry scenario projects stable returns.",
            risk_section: "Retry risk.",
            mining_section: "Under the assumption of stable energy costs, retry mining section details margin.",
            performance_section: "Retry performance.",
            methodology_note: "Retry methodology.",
            disclaimer: "Retry disclaimer.",
          }),
        },
      ],
      usage: { input_tokens: 100, output_tokens: 50 },
    };

    const error429 = new Anthropic.APIError(429, undefined, "Rate limited", undefined);

    const mockClient = {
      messages: {
        create: vi
          .fn()
          .mockRejectedValueOnce(error429)
          .mockResolvedValueOnce(mockResponse),
      },
    };

    const input: InvestorMemoInput = {
      vault: {
        aumUsdc: 12_500_000,
        apyRange: { low: 9.2, high: 12.8 },
        mode: "balanced",
        riskScore: 38,
      },
      scenarios: [],
      backtests: [],
      generatedAt: new Date().toISOString(),
    };

    const result = await runInvestorMemo(input, { client: mockClient });
    expect(result.executive_summary).toContain("assumption");
    expect(mockClient.messages.create).toHaveBeenCalledTimes(2);
  });
});
