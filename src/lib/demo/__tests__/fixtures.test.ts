/**
 * Invariant tests for the demo fixture set.
 *
 * These tests are the verrou ensuring the fixtures stay:
 *   - non-negotiable #1: APY exposed as a range, never as a single point.
 *   - non-negotiable #3: PTAI format on every rebalance/distribution event.
 *   - non-negotiable #5: zero forbidden words anywhere in user-facing strings.
 *   - deterministic: every Date is anchored, no `Date.now()` slipping in.
 *
 * Forbidden-words list is imported from the canonical source
 * (`@/lib/agents/validators.ts`) so the two stay in sync automatically.
 */

import { describe, expect, it } from "vitest";

import { FORBIDDEN_WORDS } from "@/lib/agents/validators";

import {
  DEMO_ADVANCED_METRICS,
  DEMO_BTC_PRICE,
  DEMO_DASHBOARD_DATA,
  DEMO_HASHPRICE,
  DEMO_PROOFS,
  DEMO_RISK_FRAMEWORK,
} from "../fixtures";

// ---------------------------------------------------------------------------
// Forbidden-words scanner — case-insensitive, word-boundary aware (mirrors
// `assertNoForbiddenWords` but kept inline so the test reports the offending
// field path, not a generic Error message).
// ---------------------------------------------------------------------------

function collectStrings(input: unknown, path: string, out: Array<[string, string]>): void {
  if (typeof input === "string") {
    out.push([path, input]);
    return;
  }
  if (Array.isArray(input)) {
    input.forEach((v, i) => collectStrings(v, `${path}[${i}]`, out));
    return;
  }
  if (input && typeof input === "object" && !(input instanceof Date)) {
    for (const [k, v] of Object.entries(input)) {
      collectStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

function findForbidden(input: unknown, label: string): Array<[string, string, string]> {
  const strings: Array<[string, string]> = [];
  collectStrings(input, label, strings);
  const hits: Array<[string, string, string]> = [];

  for (const [path, value] of strings) {
    const lower = value.toLowerCase();
    for (const needle of FORBIDDEN_WORDS) {
      const needlePattern = new RegExp(
        `\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`,
      );
      if (needlePattern.test(lower)) {
        // Mirror the negation exemption from the canonical validator.
        const negatedPattern = new RegExp(
          `\\b(not|no|never|without)\\s+(\\w+\\s+){0,3}${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
        );
        const startsWithNegation = /^(not|no|never|without)\b/.test(needle);
        if (!startsWithNegation && negatedPattern.test(lower)) continue;
        hits.push([path, needle, value]);
      }
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DEMO_DASHBOARD_DATA shape", () => {
  it("exposes APY as a range with low < high (non-negotiable #1)", () => {
    const { low, high } = DEMO_DASHBOARD_DATA.vault.apyRange;
    expect(low).toBeGreaterThan(0);
    expect(high).toBeGreaterThan(low);
  });

  it("uses an APY range inside the methodology 8–15% target band", () => {
    const { low, high } = DEMO_DASHBOARD_DATA.vault.apyRange;
    expect(low).toBeGreaterThanOrEqual(8);
    expect(high).toBeLessThanOrEqual(15);
  });

  it("has allocations that sum to 100%", () => {
    const total = DEMO_DASHBOARD_DATA.allocations.reduce(
      (acc, a) => acc + a.pct,
      0,
    );
    expect(total).toBe(100);
  });

  it("covers every canonical allocation bucket exactly once", () => {
    const buckets = DEMO_DASHBOARD_DATA.allocations.map((a) => a.bucket).sort();
    expect(buckets).toEqual([
      "btc_tactical",
      "mining",
      "stable_reserve",
      "usdc_base",
    ]);
  });

  it("emits PTAI-shaped rebalance events (non-negotiable #3)", () => {
    expect(DEMO_DASHBOARD_DATA.recentEvents.length).toBeGreaterThan(0);
    for (const e of DEMO_DASHBOARD_DATA.recentEvents) {
      expect(e.triggerText.toLowerCase()).toMatch(/^trigger:/);
      expect(e.actionText.toLowerCase()).toMatch(/^action:/);
      expect(e.impactText.toLowerCase()).toMatch(/^impact:/);
    }
  });

  it("produces a 30-point timeseries with monotonically increasing dates", () => {
    expect(DEMO_DASHBOARD_DATA.timeseries.nav30d).toHaveLength(30);
    expect(DEMO_DASHBOARD_DATA.timeseries.apy30d).toHaveLength(30);

    const dates = DEMO_DASHBOARD_DATA.timeseries.nav30d.map((p) => p.date);
    for (let i = 1; i < dates.length; i++) {
      const prev = dates[i - 1];
      const cur = dates[i];
      expect(prev).toBeDefined();
      expect(cur).toBeDefined();
      // Lexicographic ordering matches chronological order for ISO YYYY-MM-DD.
      expect(prev! < cur!).toBe(true);
    }
  });

  it("aligns the BTC price across every surface", () => {
    expect(DEMO_DASHBOARD_DATA.btcPrice.usd).toBe(DEMO_BTC_PRICE.usd);
    expect(DEMO_HASHPRICE.btc_price_usd).toBe(DEMO_BTC_PRICE.usd);
  });
});

describe("DEMO_RISK_FRAMEWORK shape", () => {
  it("has composite 0..100", () => {
    expect(DEMO_RISK_FRAMEWORK.composite).toBeGreaterThanOrEqual(0);
    expect(DEMO_RISK_FRAMEWORK.composite).toBeLessThanOrEqual(100);
  });

  it("covers the five canonical risk dimensions", () => {
    const ids = DEMO_RISK_FRAMEWORK.dimensions.map((d) => d.id).sort();
    expect(ids).toEqual([
      "counterparty",
      "liquidity",
      "market",
      "mining",
      "smart_contract",
    ]);
  });
});

describe("DEMO_PROOFS shape", () => {
  it("ships at least 6 entries across all four proof types", () => {
    expect(DEMO_PROOFS.length).toBeGreaterThanOrEqual(6);
    const types = new Set(DEMO_PROOFS.map((p) => p.proofType));
    expect(types).toEqual(
      new Set(["mining_attestation", "custody", "audit", "methodology"]),
    );
  });

  it("has a parseable ISO `postedAt` on every entry", () => {
    for (const p of DEMO_PROOFS) {
      expect(Number.isFinite(new Date(p.postedAt).getTime())).toBe(true);
    }
  });
});

describe("DEMO_ADVANCED_METRICS shape", () => {
  it("is available with a positive Sharpe and Sortino", () => {
    expect(DEMO_ADVANCED_METRICS.available).toBe(true);
    expect(DEMO_ADVANCED_METRICS.sharpe).toBeGreaterThan(0);
    expect(DEMO_ADVANCED_METRICS.sortino).toBeGreaterThan(
      DEMO_ADVANCED_METRICS.sharpe,
    );
  });

  it("reports VaR and max drawdown as positive decimal losses", () => {
    expect(DEMO_ADVANCED_METRICS.varDecimal).toBeGreaterThan(0);
    expect(DEMO_ADVANCED_METRICS.varDecimal).toBeLessThan(1);
    expect(DEMO_ADVANCED_METRICS.maxDrawdownDecimal).toBeGreaterThan(0);
    expect(DEMO_ADVANCED_METRICS.maxDrawdownDecimal).toBeLessThan(1);
  });
});

describe("forbidden-words guarantee across every fixture", () => {
  it("DEMO_DASHBOARD_DATA contains no forbidden words", () => {
    const hits = findForbidden(DEMO_DASHBOARD_DATA, "DEMO_DASHBOARD_DATA");
    expect(hits).toEqual([]);
  });

  it("DEMO_RISK_FRAMEWORK contains no forbidden words", () => {
    const hits = findForbidden(DEMO_RISK_FRAMEWORK, "DEMO_RISK_FRAMEWORK");
    expect(hits).toEqual([]);
  });

  it("DEMO_PROOFS contains no forbidden words", () => {
    const hits = findForbidden(DEMO_PROOFS, "DEMO_PROOFS");
    expect(hits).toEqual([]);
  });

  it("DEMO_ADVANCED_METRICS contains no forbidden words", () => {
    const hits = findForbidden(DEMO_ADVANCED_METRICS, "DEMO_ADVANCED_METRICS");
    expect(hits).toEqual([]);
  });

  it("DEMO_HASHPRICE and DEMO_BTC_PRICE contain no forbidden words", () => {
    expect(findForbidden(DEMO_HASHPRICE, "DEMO_HASHPRICE")).toEqual([]);
    expect(findForbidden(DEMO_BTC_PRICE, "DEMO_BTC_PRICE")).toEqual([]);
  });
});
