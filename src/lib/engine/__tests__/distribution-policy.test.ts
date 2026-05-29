import { describe, it, expect } from "vitest";
import { recommendDistributionAction } from "@/lib/engine/distribution-policy";

describe("recommendDistributionAction — bands → action/maxPayout", () => {
  it("≥1.25 → normal, 100%", () => {
    const r = recommendDistributionAction(1.4);
    expect(r.action).toBe("normal");
    expect(r.maxPayout).toBe(1);
    expect(r.badge).toBe("attested");
  });

  it("1.0–1.25 → monitor, 100%", () => {
    const r = recommendDistributionAction(1.1);
    expect(r.action).toBe("monitor");
    expect(r.maxPayout).toBe(1);
  });

  it("0.8–1.0 → reduce, 80% (strictly below cash flow — no principal erosion)", () => {
    const r = recommendDistributionAction(0.9);
    expect(r.action).toBe("reduce");
    expect(r.maxPayout).toBe(0.8);
    expect(r.maxPayout).toBeLessThan(1);
  });

  it("<0.8 → suspend, 0% (never from principal)", () => {
    const r = recommendDistributionAction(0.5);
    expect(r.action).toBe("suspend");
    expect(r.maxPayout).toBe(0);
  });
});

describe("recommendDistributionAction — incomputable → pending suspend", () => {
  it("null ratio → suspend, 0%, pending copy", () => {
    const r = recommendDistributionAction(null);
    expect(r.action).toBe("suspend");
    expect(r.maxPayout).toBe(0);
    expect(r.state).toBe("invalid");
    expect(r.lpExplanation.toLowerCase()).toContain("pending");
  });

  it("negative / NaN ratio → suspend", () => {
    expect(recommendDistributionAction(-1).action).toBe("suspend");
    expect(recommendDistributionAction(Number.NaN).action).toBe("suspend");
  });
});

describe("no silent principal erosion invariant", () => {
  it("any maxPayout > target only when ratio ≥ 1.0", () => {
    for (const ratio of [0.0, 0.5, 0.79, 0.8, 0.99]) {
      const r = recommendDistributionAction(ratio);
      // below 1.0 coverage, payout is capped strictly below full (≤0.8) or 0.
      expect(r.maxPayout).toBeLessThanOrEqual(0.8);
    }
    for (const ratio of [1.0, 1.25, 2.0]) {
      expect(recommendDistributionAction(ratio).maxPayout).toBe(1);
    }
  });

  it("no forbidden words in LP explanations", () => {
    const forbidden = ["guarantee", "promise", "certain", "risk-free", "no risk"];
    for (const ratio of [1.4, 1.1, 0.9, 0.5, null] as const) {
      const txt = recommendDistributionAction(ratio).lpExplanation.toLowerCase();
      for (const w of forbidden) expect(txt).not.toContain(w);
    }
  });
});
