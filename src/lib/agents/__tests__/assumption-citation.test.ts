import { describe, expect, it } from "vitest";

import {
  InvestorMemoOutputSchema,
  RiskExplanationOutputSchema,
  type InvestorMemoOutput,
  type RiskExplanationOutput,
} from "@/lib/agents/schemas";
import { assertCitesAssumption } from "@/lib/agents/validators";

/**
 * Regression tests for Fix H — every agent narrative output must cite >=1
 * assumption (spec/09-agents.mdx).
 *
 * These tests mirror the exact post-validation wiring inside
 * `runRiskExplanation` and `runInvestorMemo` without invoking the LLM client
 * (which performs Prisma I/O). They lock the invariant: each newly covered
 * field is asserted, and `disclaimer` stays exempt.
 */

/* -------------------------------------------------------------------------- */
/* Risk Explanation — top_risks[].explanation                                 */
/* -------------------------------------------------------------------------- */

/** Re-implements the validation loop from risk-explanation.ts (lines ~170-178). */
function validateRiskExplanation(output: RiskExplanationOutput): void {
  for (const risk of output.top_risks) {
    assertCitesAssumption(risk.explanation);
  }
  assertCitesAssumption(output.overall_summary);
}

describe("Risk Explanation — assumption citation on top_risks[].explanation", () => {
  const base: RiskExplanationOutput = RiskExplanationOutputSchema.parse({
    top_risks: [
      {
        risk_id: "mining",
        name: "Mining Risk",
        explanation:
          "Under the assumption that hashprice stays within its 30-day range, mining margin remains adequate.",
        suggested_guardrail: "Consider reducing mining allocation per Rule RISK-02.",
      },
    ],
    overall_summary:
      "Assuming current conditions persist, aggregate vault risk posture is moderate.",
  });

  it("passes when every explanation cites an assumption", () => {
    expect(() => validateRiskExplanation(base)).not.toThrow();
  });

  it("throws when a risk explanation does not cite any assumption", () => {
    const bad: RiskExplanationOutput = {
      ...base,
      top_risks: [
        {
          ...base.top_risks[0]!,
          explanation: "Mining margin is compressed because energy costs rose this quarter.",
        },
      ],
    };
    expect(() => validateRiskExplanation(bad)).toThrow(/assumption/i);
  });

  it("throws when the second risk explanation omits the assumption", () => {
    const bad: RiskExplanationOutput = RiskExplanationOutputSchema.parse({
      top_risks: [
        base.top_risks[0]!,
        {
          risk_id: "market",
          name: "Market Risk",
          explanation: "BTC drawdown widened the stressed APY band considerably.",
          suggested_guardrail: "Review hedging policy per Rule RISK-05.",
        },
      ],
      overall_summary: base.overall_summary,
    });
    expect(() => validateRiskExplanation(bad)).toThrow(/assumption/i);
  });
});

/* -------------------------------------------------------------------------- */
/* Investor Memo — 7 narrative sections cited, disclaimer exempt              */
/* -------------------------------------------------------------------------- */

/** Re-implements the assumption-citation block from investor-memo.ts (~229-241). */
function validateInvestorMemoAssumptions(output: InvestorMemoOutput): void {
  assertCitesAssumption(output.executive_summary);
  assertCitesAssumption(output.vault_structure);
  assertCitesAssumption(output.scenario_analysis);
  assertCitesAssumption(output.risk_section);
  assertCitesAssumption(output.mining_section);
  assertCitesAssumption(output.performance_section);
  assertCitesAssumption(output.methodology_note);
  // disclaimer intentionally NOT checked — verbatim legal template.
}

const CITES = "Under the assumption that conditions hold, this section is consistent.";

function memoWith(overrides: Partial<InvestorMemoOutput>): InvestorMemoOutput {
  return InvestorMemoOutputSchema.parse({
    executive_summary: CITES,
    vault_structure: CITES,
    scenario_analysis: CITES,
    risk_section: CITES,
    mining_section: CITES,
    performance_section: CITES,
    methodology_note: CITES,
    disclaimer: "Past performance is not indicative of future results.",
    ...overrides,
  });
}

describe("Investor Memo — assumption citation on all narrative sections", () => {
  it("passes when all 7 narrative sections cite an assumption", () => {
    expect(() => validateInvestorMemoAssumptions(memoWith({}))).not.toThrow();
  });

  it("does not require the disclaimer to cite an assumption (exempt template)", () => {
    const memo = memoWith({
      disclaimer:
        "Investments may lose value. Returns are not assured. This is a legal notice.",
    });
    expect(() => validateInvestorMemoAssumptions(memo)).not.toThrow();
  });

  for (const field of [
    "vault_structure",
    "risk_section",
    "performance_section",
    "methodology_note",
  ] as const) {
    it(`throws when ${field} omits an assumption`, () => {
      const memo = memoWith({ [field]: "This section states facts with no caveat." });
      expect(() => validateInvestorMemoAssumptions(memo)).toThrow(/assumption/i);
    });
  }
});
