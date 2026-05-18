import { describe, expect, it } from "vitest";

import {
  InvestorMemoOutputSchema,
  MiningHealthOutputSchema,
  RiskExplanationOutputSchema,
  ScenarioNarrativeOutputSchema,
} from "@/lib/agents/schemas";
import {
  assertCitesAssumption,
  assertNoForbiddenWords,
  FORBIDDEN_WORDS,
} from "@/lib/agents/validators";

describe("ScenarioNarrativeOutputSchema", () => {
  it("parses a well-formed payload", () => {
    const valid = {
      narrative_md:
        "Under the assumption that hashprice stays flat, the projected APY range is 9.4-12.8%.",
      risk_warning: "Hashprice volatility could compress mining margin.",
      confidence: "medium" as const,
      key_drivers: ["hashprice stability", "uptime above 98%", "USDC base yield"],
    };

    const parsed = ScenarioNarrativeOutputSchema.parse(valid);
    expect(parsed.confidence).toBe("medium");
    expect(parsed.key_drivers).toHaveLength(3);
  });

  it("rejects an invalid confidence value", () => {
    const invalid = {
      narrative_md: "Assumption: stable conditions.",
      risk_warning: "Standard risks apply.",
      confidence: "uncertain",
      key_drivers: ["driver-a"],
    };

    expect(() => ScenarioNarrativeOutputSchema.parse(invalid)).toThrow();
  });

  it("rejects unknown extra keys (strict)", () => {
    const withExtra = {
      narrative_md: "Assumption noted.",
      risk_warning: "Risk noted.",
      confidence: "high" as const,
      key_drivers: ["a"],
      surprise_field: "not allowed",
    };

    expect(() => ScenarioNarrativeOutputSchema.parse(withExtra)).toThrow();
  });

  it("rejects an empty key_drivers array", () => {
    const invalid = {
      narrative_md: "Assumption noted.",
      risk_warning: "Risk noted.",
      confidence: "high" as const,
      key_drivers: [],
    };

    expect(() => ScenarioNarrativeOutputSchema.parse(invalid)).toThrow();
  });
});

describe("MiningHealthOutputSchema", () => {
  it("parses a well-formed payload", () => {
    const valid = {
      alert_level: "amber" as const,
      summary:
        "Margin compressed to 12% on the assumption that energy cost stays flat; uptime 97.4%.",
      recommendation: "Consider reviewing the hosting contract pricing tier.",
    };

    expect(MiningHealthOutputSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an invalid alert_level", () => {
    const invalid = {
      alert_level: "orange",
      summary: "Assumption noted.",
      recommendation: "Suggest review.",
    };

    expect(() => MiningHealthOutputSchema.parse(invalid)).toThrow();
  });

  it("accepts each of green / amber / red", () => {
    for (const level of ["green", "amber", "red"] as const) {
      const ok = {
        alert_level: level,
        summary: "Under the assumption of stable hashprice, KPIs are nominal.",
        recommendation: "Suggest continued monitoring.",
      };
      expect(MiningHealthOutputSchema.parse(ok).alert_level).toBe(level);
    }
  });
});

describe("assertNoForbiddenWords", () => {
  it("throws on lowercase 'guarantee'", () => {
    expect(() =>
      assertNoForbiddenWords("We guarantee an 11% yield."),
    ).toThrowError(/guarantee/i);
  });

  it("throws on capitalised 'Guarantee'", () => {
    expect(() =>
      assertNoForbiddenWords("Guarantee of capital is not implied."),
    ).toThrowError(/guarantee/i);
  });

  it("throws on uppercase 'GUARANTEE'", () => {
    expect(() => assertNoForbiddenWords("WE GUARANTEE NOTHING."))
      .toThrowError(/guarantee/i);
  });

  it("throws on 'risk-free'", () => {
    expect(() =>
      assertNoForbiddenWords("This is a risk-free strategy."),
    ).toThrowError(/risk-free/i);
  });

  it("throws on the multi-word 'will deliver'", () => {
    expect(() =>
      assertNoForbiddenWords("The vault will deliver 12%."),
    ).toThrowError(/will deliver/i);
  });

  it("throws on 'no risk'", () => {
    expect(() =>
      assertNoForbiddenWords("There is no risk to principal."),
    ).toThrowError(/no risk/i);
  });

  // Regression: prefix-anchored detection must still catch inflected forms.
  // A trailing `\b` previously let "guaranteed" / "promises" / "certainly"
  // through, silently breaking Hearst non-negotiable #5.
  it.each([
    "This product is guaranteed.",
    "The fund guarantees a payout.",
    "The strategy promises stable yield.",
    "Returns were promised to investors.",
    "Performance is certainly above market.",
    "There is certainty in this outcome.",
    "The vault will delivers returns.",
  ])("throws on inflected forbidden form: %s", (text) => {
    expect(() => assertNoForbiddenWords(text)).toThrow();
  });

  it("exempts negated inflected forms", () => {
    expect(() =>
      assertNoForbiddenWords("Outcomes are not guaranteed and never promised."),
    ).not.toThrow();
  });

  it("still lints disclaimer-style text (no special-casing)", () => {
    // Negated legal phrasing passes via the negation exemption...
    expect(() =>
      assertNoForbiddenWords(
        "This is not an offer; returns are not guaranteed and no promise of capital protection is made.",
      ),
    ).not.toThrow();
    // ...but an unconditional positive claim slipped into a disclaimer still fails.
    expect(() =>
      assertNoForbiddenWords("We guarantee capital protection at all times."),
    ).toThrow();
  });

  it("passes on clean text", () => {
    expect(() =>
      assertNoForbiddenWords(
        "Under the stated assumption, projected APY is 9.4-12.8%. Outcomes may vary.",
      ),
    ).not.toThrow();
  });

  it("covers every word in FORBIDDEN_WORDS", () => {
    for (const word of FORBIDDEN_WORDS) {
      expect(() => assertNoForbiddenWords(`Some prefix ${word} some suffix.`))
        .toThrow();
    }
  });
});

describe("assertCitesAssumption", () => {
  it("passes when 'assumption' is present", () => {
    expect(() =>
      assertCitesAssumption("Our key assumption is stable hashprice."),
    ).not.toThrow();
  });

  it("passes when 'assumes' is present", () => {
    expect(() =>
      assertCitesAssumption("This projection assumes uptime above 98%."),
    ).not.toThrow();
  });

  it("passes when French 'hypothèse' is present", () => {
    expect(() =>
      assertCitesAssumption("Sous l'hypothèse d'un hashprice stable, la fourchette est 9.4-12.8%."),
    ).not.toThrow();
  });

  it("throws when no assumption is cited", () => {
    expect(() =>
      assertCitesAssumption("The projected APY is 9.4-12.8% and we expect strong results."),
    ).toThrowError(/assumption/i);
  });
});

/* -------------------------------------------------------------------------- */
/* RiskExplanationOutputSchema                                                  */
/* -------------------------------------------------------------------------- */

describe("RiskExplanationOutputSchema", () => {
  const validRisk = {
    risk_id: "market",
    name: "Market Risk",
    explanation:
      "Under the assumption that BTC price stays within the 30-day range, market risk is elevated due to recent volatility.",
    suggested_guardrail:
      "Consider reducing BTC tactical allocation per Rule RISK-01 if market score exceeds 65.",
  };

  it("parses a valid payload with 1 top_risk", () => {
    const payload = {
      top_risks: [validRisk],
      overall_summary:
        "Under the assumption of stable hashprice, overall risk posture is elevated primarily by market exposure.",
    };
    const parsed = RiskExplanationOutputSchema.parse(payload);
    expect(parsed.top_risks).toHaveLength(1);
    expect(parsed.top_risks[0]?.risk_id).toBe("market");
  });

  it("parses a valid payload with 2 top_risks", () => {
    const secondRisk = {
      risk_id: "mining",
      name: "Mining Risk",
      explanation:
        "Under the assumption that energy costs remain at current contracted rates, mining margin compression is the key driver.",
      suggested_guardrail:
        "Consider reviewing the hosting contract pricing tier per Rule RISK-02 if margin drops below 10%.",
    };
    const payload = {
      top_risks: [validRisk, secondRisk],
      overall_summary:
        "Under the assumption of stable operating conditions, both market and mining risks are elevated.",
    };
    const parsed = RiskExplanationOutputSchema.parse(payload);
    expect(parsed.top_risks).toHaveLength(2);
  });

  it("rejects an empty top_risks array (min 1)", () => {
    const payload = {
      top_risks: [],
      overall_summary: "Under the assumption of stable conditions, risk is low.",
    };
    expect(() => RiskExplanationOutputSchema.parse(payload)).toThrow();
  });

  it("rejects top_risks with more than 2 entries (max 2)", () => {
    const payload = {
      top_risks: [validRisk, validRisk, validRisk],
      overall_summary: "Under the assumption of stable conditions, risk is elevated.",
    };
    expect(() => RiskExplanationOutputSchema.parse(payload)).toThrow();
  });

  it("rejects unknown extra keys at the top level (strict)", () => {
    const payload = {
      top_risks: [validRisk],
      overall_summary: "Under the assumption of stable conditions, risk is elevated.",
      unexpected_field: "not allowed",
    };
    expect(() => RiskExplanationOutputSchema.parse(payload)).toThrow();
  });

  it("rejects unknown extra keys inside a top_risk entry (strict)", () => {
    const riskWithExtra = {
      ...validRisk,
      surprise_field: "not allowed",
    };
    const payload = {
      top_risks: [riskWithExtra],
      overall_summary: "Under the assumption of stable conditions, risk is elevated.",
    };
    expect(() => RiskExplanationOutputSchema.parse(payload)).toThrow();
  });
});

/* -------------------------------------------------------------------------- */
/* InvestorMemoOutputSchema                                                     */
/* -------------------------------------------------------------------------- */

describe("InvestorMemoOutputSchema", () => {
  const validMemo = {
    executive_summary:
      "Under the assumption that hashprice remains within the 30-day range, the Hearst Yield Vault targets an APY range of 8-15%.",
    vault_structure:
      "The vault is structured as a Cayman Exempted Limited Partnership with a $250k minimum ticket and 60-day soft lock-up.",
    scenario_analysis:
      "Under the base-case assumption of stable BTC price and hashprice, the projected APY range is 9.4-12.8%.",
    risk_section:
      "Market risk score is 42 (amber). Mining risk score is 28 (green). Under the assumption of current difficulty, liquidity risk remains low.",
    mining_section:
      "Under the assumption that energy costs stay at the contracted rate, net mining margin is 18% for the trailing 30 days.",
    performance_section:
      "The bear-case backtest, under the assumption of BTC -40% and hashprice -30%, produced a total return of -2.1% with a max drawdown of -8.4%.",
    methodology_note:
      "This memo references Hearst methodology v1.0. All projections assume data freshness within 24 hours.",
    disclaimer:
      "Projections are conditional on the stated assumptions. Past performance does not indicate future results.",
  };

  it("parses a valid payload with all 8 fields", () => {
    const parsed = InvestorMemoOutputSchema.parse(validMemo);
    expect(Object.keys(parsed)).toHaveLength(8);
    expect(parsed.executive_summary).toBe(validMemo.executive_summary);
  });

  it("rejects a payload missing one field", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { disclaimer, ...withoutDisclaimer } = validMemo;
    expect(() => InvestorMemoOutputSchema.parse(withoutDisclaimer)).toThrow();
  });

  it("rejects a payload missing multiple fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { executive_summary, vault_structure, ...rest } = validMemo;
    expect(() => InvestorMemoOutputSchema.parse(rest)).toThrow();
  });

  it("rejects unknown extra keys (strict)", () => {
    const withExtra = {
      ...validMemo,
      extra_section: "not allowed",
    };
    expect(() => InvestorMemoOutputSchema.parse(withExtra)).toThrow();
  });

  it("rejects empty string for any required field", () => {
    const withEmpty = {
      ...validMemo,
      executive_summary: "",
    };
    expect(() => InvestorMemoOutputSchema.parse(withEmpty)).toThrow();
  });
});
