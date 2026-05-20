import { describe, expect, it } from "vitest";

import {
  BASE_MIX_BY_MODE,
  buildSignal,
  evaluateRules,
  THRESHOLDS,
  type RebalanceSignal,
  type VaultStateForSignal,
} from "../rebalancing-rules";

import * as RebalancingRules from "../rebalancing-rules";

/**
 * Pure-engine tests for the rebalancing rule evaluator.
 * No mocks, no Prisma, no fetch — `evaluateRules` is a pure function.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASOF = new Date("2026-05-20T12:00:00.000Z");

function buildHealthyState(): VaultStateForSignal {
  return {
    scenarioInputs: {
      btc_price_change_pct: 4,
      hashprice_usd_th_day: 0.082,
      energy_cost_kwh: 0.05,
      stable_apy_pct: 4.0,
      vol_index: 45,
    },
    mode: "balanced",
    riskScore: 42,
    miningMarginScore: 70,
    miningNetApyPct: 9.2,
    stableApyPct: 4.0,
    hashpriceTrendPct: -3.2,
    btcPositionPct: 14,
    btcUsd: 95_000,
    source: "db",
  };
}

function ruleIds(signals: RebalanceSignal[]): string[] {
  return signals.map((s) => s.ruleId);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("evaluateRules — pure engine library", () => {
  // ---- Case A: healthy state -> no signals --------------------------------

  it("Case A — healthy state: signals.length === 0", () => {
    const { signals } = evaluateRules({ state: buildHealthyState(), asOf: ASOF });
    expect(signals).toEqual([]);
  });

  // ---- Case B: R2 fires when margin < 50 ----------------------------------

  it("Case B — R2 (mining margin < 50): single signal with full PTAI fields", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      miningMarginScore: 40,
    };
    const { signals } = evaluateRules({ state, asOf: ASOF });

    expect(ruleIds(signals)).toContain("R2");
    const r2 = signals.find((s) => s.ruleId === "R2");
    expect(r2).toBeDefined();
    if (!r2) return;

    // PTAI: 4 fields all populated
    expect(r2.trigger.length).toBeGreaterThan(0);
    expect(r2.projection.length).toBeGreaterThan(0);
    expect(r2.action.length).toBeGreaterThan(0);
    expect(r2.impact.length).toBeGreaterThan(0);

    // APY mentions must be a range
    expect(r2.projection).toMatch(/\d+(\.\d+)?-\d+(\.\d+)?%/);
    expect(r2.impact).toMatch(/\d+(\.\d+)?-\d+(\.\d+)?%/);

    // From baseline = balanced
    expect(r2.fromAllocation).toEqual(BASE_MIX_BY_MODE.balanced);

    // Mining reduced by 30% (from 35 to round(35*0.7)=25 → shift=10)
    expect(r2.toAllocation.mining).toBe(25);
    expect(r2.toAllocation.stable_reserve).toBe(20); // 10 + 10
  });

  // ---- Case C: R3 fires on BTC momentum + healthy margin ------------------

  it("Case C — R3 (margin > 75 AND BTC > 0): single signal", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      miningMarginScore: 82,
      scenarioInputs: {
        ...buildHealthyState().scenarioInputs,
        btc_price_change_pct: 12,
      },
    };
    const { signals } = evaluateRules({ state, asOf: ASOF });
    expect(ruleIds(signals)).toEqual(["R3"]);
    const r3 = signals[0]!;
    expect(r3.toAllocation.mining).toBe(45);
    expect(r3.fromAllocation.mining).toBe(35);
  });

  // ---- Case D: Combined R3 + R-BTC-3 on rally + healthy margin ------------

  it("Case D — combined: R3 + R-BTC-3 fire together on BTC rally", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      miningMarginScore: 82,
      btcPositionPct: 14,
      scenarioInputs: {
        ...buildHealthyState().scenarioInputs,
        btc_price_change_pct: 35,
      },
    };
    const { signals } = evaluateRules({ state, asOf: ASOF });
    const ids = ruleIds(signals);
    expect(ids).toContain("R3");
    expect(ids).toContain("R-BTC-3");
    // Each ruleId only once
    expect(new Set(ids).size).toBe(ids.length);
  });

  // ---- Case E: R-BTC-1 fires on -20% drawdown + healthy margin ------------

  it("Case E — R-BTC-1 (BTC -25% AND margin >= 60 AND position < 20%)", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      mode: "balanced",
      miningMarginScore: 70,
      btcPositionPct: 14,
      scenarioInputs: {
        ...buildHealthyState().scenarioInputs,
        btc_price_change_pct: -25,
      },
    };
    const { signals } = evaluateRules({ state, asOf: ASOF });
    const ids = ruleIds(signals);
    expect(ids).toContain("R-BTC-1");
    expect(ids).toContain("R1"); // -25 also trips R1

    const rbtc1 = signals.find((s) => s.ruleId === "R-BTC-1");
    expect(rbtc1).toBeDefined();
    if (!rbtc1) return;
    expect(rbtc1.toAllocation.btc_tactical).toBe(20); // 15 + 5
    expect(rbtc1.toAllocation.usdc_base).toBe(35); // 40 - 5
  });

  // ---- Case F: Determinism / idempotency of evaluation --------------------

  it("Case F — pure idempotency: same input → byte-identical output", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      miningMarginScore: 40,
      scenarioInputs: {
        ...buildHealthyState().scenarioInputs,
        btc_price_change_pct: -30,
      },
    };
    const a = evaluateRules({ state, asOf: ASOF });
    const b = evaluateRules({ state, asOf: ASOF });
    const c = evaluateRules({ state, asOf: new Date("2099-01-01T00:00:00Z") });
    expect(a).toEqual(b);
    // asOf currently unused → output independent of asOf
    expect(a).toEqual(c);

    // Input must not be mutated
    expect(state.miningMarginScore).toBe(40);
    expect(state.scenarioInputs.btc_price_change_pct).toBe(-30);
  });

  // ---- PTAI invariants on a known-armed multi-rule scenario ---------------

  it("PTAI invariants — no forbidden words (bare), APY always a range", () => {
    const state: VaultStateForSignal = {
      ...buildHealthyState(),
      miningMarginScore: 40,
    };
    const { signals } = evaluateRules({ state, asOf: ASOF });
    expect(signals.length).toBeGreaterThan(0);

    const bareBadPattern = /(?<!\b(not|no|never|without)\s+(\w+\s+){0,3})\b(guarantee|promise|certain|will deliver|risk-free|no risk)\w*/i;

    for (const s of signals) {
      const all = [s.trigger, s.action, s.projection, s.impact].join(" ");
      expect(bareBadPattern.test(all)).toBe(false);

      // If APY is mentioned, must be a range.
      for (const text of [s.projection, s.impact]) {
        if (text.toLowerCase().includes("apy")) {
          expect(text).toMatch(/\d+(\.\d+)?-\d+(\.\d+)?%/);
        }
      }
    }
  });

  // ---- buildSignal forbidden-words guard ----------------------------------

  it("buildSignal throws on bare forbidden words", () => {
    expect(() =>
      buildSignal({
        ruleId: "TEST",
        trigger: "this is a guarantee",
        projection: "ok",
        action: "ok",
        impact: "ok",
        from: BASE_MIX_BY_MODE.balanced,
        to: BASE_MIX_BY_MODE.balanced,
      }),
    ).toThrow(/forbidden word/i);
  });

  it("buildSignal allows negated forms (e.g. 'not guaranteed')", () => {
    const signal = buildSignal({
      ruleId: "TEST",
      trigger: "ok",
      projection: "outcome is not guaranteed",
      action: "ok",
      impact: "ok",
      from: BASE_MIX_BY_MODE.balanced,
      to: BASE_MIX_BY_MODE.balanced,
    });
    expect(signal.ruleId).toBe("TEST");
    // Allocation snapshots are fresh copies
    expect(signal.fromAllocation).not.toBe(BASE_MIX_BY_MODE.balanced);
    expect(signal.toAllocation).not.toBe(BASE_MIX_BY_MODE.balanced);
  });

  // ---- Thresholds exported as a frozen constant ---------------------------

  it("THRESHOLDS exports spec values", () => {
    expect(THRESHOLDS.R1_BTC_DRAWDOWN_PCT).toBe(-25);
    expect(THRESHOLDS.R2_MARGIN_THRESHOLD).toBe(50);
    expect(THRESHOLDS.R3_MARGIN_THRESHOLD).toBe(75);
    expect(THRESHOLDS.R4_HASHPRICE_TREND_PCT).toBe(-20);
    expect(THRESHOLDS.RBTC_VOL_BREACH).toBe(90);
  });
});

// ---------------------------------------------------------------------------
// Purity guard — importing the module must not trigger I/O or side effects.
// We can't observe "no I/O" directly, but we can assert that the module
// exposes only function/constant exports, and that nothing throws or
// performs work at import time.
// ---------------------------------------------------------------------------

describe("rebalancing-rules module purity", () => {
  it("module exports only functions and plain data — no side effects on import", () => {
    expect(typeof RebalancingRules.evaluateRules).toBe("function");
    expect(typeof RebalancingRules.buildSignal).toBe("function");
    expect(typeof RebalancingRules.THRESHOLDS).toBe("object");
    expect(typeof RebalancingRules.BASE_MIX_BY_MODE).toBe("object");

    // No Prisma, no fetch, no fs symbols should leak.
    const exported = Object.keys(RebalancingRules);
    for (const key of exported) {
      expect(key).not.toMatch(/^(prisma|db|fetch|fs|process)$/i);
    }
  });
});
