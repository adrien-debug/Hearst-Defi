import { describe, expect, it } from "vitest";

import {
  MiningHealthOutputSchema,
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
