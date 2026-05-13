import { describe, expect, it, vi } from "vitest";

import type { InvestorMemoInput } from "@/lib/agents/investor-memo";
import type { InvestorMemoOutput } from "@/lib/agents/schemas";

const loaderFake: InvestorMemoInput = {
  vault: {
    aumUsdc: 12_500_000,
    apyRange: { low: 9.2, high: 12.8 },
    mode: "balanced",
    riskScore: 38,
  },
  scenarios: [],
  backtests: [],
  generatedAt: "2026-01-01T00:00:00.000Z",
};

const loadMemoInputMock = vi.fn(async () => loaderFake);

vi.mock("@/lib/agents/loaders/vault", () => ({
  loadMemoInput: loadMemoInputMock,
}));

const memoOutputFake: InvestorMemoOutput = {
  executive_summary:
    "Under the assumption that current market conditions persist, the vault is operating in balanced mode at 9.20-12.80%.",
  vault_structure:
    "Cayman SPV with single-vault posture, assumes 60-day soft lock-up.",
  scenario_analysis:
    "No scenarios were supplied this period; this assumes the cron seeded a baseline.",
  risk_section:
    "Market, mining, liquidity, smart_contract, counterparty — assumes current posture documented.",
  mining_section:
    "Hashrate, margin, energy, uptime — assumes 30-day rolling window.",
  performance_section:
    "No backtests supplied; this assumes the memo cron was triggered out-of-cycle.",
  methodology_note:
    "Methodology v1.0 — assumes the immutable rubric is up to date.",
  disclaimer:
    "Projection only; past performance is not indicative of future results. Outputs are not guaranteed.",
};

const runInvestorMemoMock = vi.fn(async (_input: InvestorMemoInput) => memoOutputFake);

vi.mock("@/lib/agents/investor-memo", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/agents/investor-memo")
  >("@/lib/agents/investor-memo");
  return {
    ...actual,
    runInvestorMemo: runInvestorMemoMock,
  };
});

describe("investorMemoMonthly Inngest function", () => {
  it("registers with id 'investor-memo-monthly'", async () => {
    const { investorMemoMonthly, INVESTOR_MEMO_MONTHLY_ID } = await import(
      "@/lib/inngest/functions/investor-memo-monthly"
    );
    expect(INVESTOR_MEMO_MONTHLY_ID).toBe("investor-memo-monthly");
    expect(investorMemoMonthly.opts.id).toBe("investor-memo-monthly");
  });

  it("uses the monthly cron expression (1st of month, 09:00 UTC)", async () => {
    const { investorMemoMonthly, INVESTOR_MEMO_MONTHLY_CRON } = await import(
      "@/lib/inngest/functions/investor-memo-monthly"
    );
    expect(INVESTOR_MEMO_MONTHLY_CRON).toBe("0 9 1 * *");

    const triggers = investorMemoMonthly.opts.triggers;
    expect(triggers).toHaveLength(1);
    const trigger = triggers?.[0];
    if (!trigger || !("cron" in trigger)) {
      throw new Error("Expected a cron trigger on investorMemoMonthly.");
    }
    expect(trigger.cron).toBe("0 9 1 * *");
  });

  it("handler calls the loader and forwards its output to the agent", async () => {
    loadMemoInputMock.mockClear();
    runInvestorMemoMock.mockClear();

    const { investorMemoMonthlyHandler } = await import(
      "@/lib/inngest/functions/investor-memo-monthly"
    );

    const stepShim = {
      run: <T,>(_name: string, fn: () => T | Promise<T>): Promise<T> =>
        Promise.resolve(fn()),
    };

    const out = await investorMemoMonthlyHandler({ step: stepShim });

    expect(loadMemoInputMock).toHaveBeenCalledTimes(1);
    expect(runInvestorMemoMock).toHaveBeenCalledTimes(1);
    expect(runInvestorMemoMock).toHaveBeenCalledWith(loaderFake);
    expect(out).toEqual(memoOutputFake);
  });
});
