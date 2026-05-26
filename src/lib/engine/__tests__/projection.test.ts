import { describe, expect, it } from "vitest";

import { projectVaultApy, type VaultDraft } from "../projection";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_DRAFT: VaultDraft = {
  targetApyLowBps: 800,     // 8%
  targetApyHighBps: 1500,   // 15%
  mgmtFeeBps: 200,          // 2% annual mgmt drag
  perfFeeBps: 2000,         // 20% perf fee on spread
  softLockupDays: 60,
  requiredSigners: 3,
  signersWhitelist: ["0xA", "0xB", "0xC", "0xD", "0xE"],
  targetMiningBps: 5000,
  targetBtcTacticalBps: 2500,
  targetUsdcBaseBps: 1500,
  targetStableReserveBps: 1000,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("projectVaultApy", () => {
  it("returns a ProjectionResult with low < high (range always a spread)", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.apyLow).toBeLessThan(result.apyHigh);
  });

  it("applies mgmt fee drag symmetrically to both ends", () => {
    const nofee: VaultDraft = {
      ...BASE_DRAFT,
      mgmtFeeBps: 0,
      perfFeeBps: 0,
    };
    const withfee: VaultDraft = {
      ...BASE_DRAFT,
      mgmtFeeBps: 100,  // 1%
      perfFeeBps: 0,
    };
    const r0 = projectVaultApy(nofee);
    const r1 = projectVaultApy(withfee);
    // Both ends should be reduced by exactly 1 percentage point
    expect(r1.apyLow).toBeCloseTo(r0.apyLow - 1, 5);
    expect(r1.apyHigh).toBeCloseTo(r0.apyHigh - 1, 5);
  });

  it("changing mgmtFee modifies both output apyLow and apyHigh", () => {
    const base = projectVaultApy(BASE_DRAFT);
    const higher: VaultDraft = { ...BASE_DRAFT, mgmtFeeBps: 300 };
    const result = projectVaultApy(higher);
    // 100-bps increase in mgmt fee → 1% lower on both ends
    expect(result.apyLow).toBeCloseTo(base.apyLow - 1, 5);
    expect(result.apyHigh).toBeLessThan(base.apyHigh);
  });

  it("apyRangeLabel uses en-dash (–) not hyphen (-)", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.apyRangeLabel).toContain("–");
    expect(result.apyRangeLabel).not.toMatch(/\d-\d/); // no digit-hyphen-digit
  });

  it("apyRangeLabel ends with %", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.apyRangeLabel).toMatch(/%$/);
  });

  it("quorum reflects requiredSigners / effectiveSigners", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.quorum).toBe("3/5");
  });

  it("lockupDays matches draft.softLockupDays", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.lockupDays).toBe(60);
  });

  it("assumptions array is non-empty (non-negotiable #10)", () => {
    const result = projectVaultApy(BASE_DRAFT);
    expect(result.assumptions.length).toBeGreaterThan(0);
  });

  it("forbidden words are absent from all assumption strings", () => {
    const FORBIDDEN = ["guarantee", "promise", "certain", "will deliver", "risk-free"];
    const result = projectVaultApy(BASE_DRAFT);
    for (const assumption of result.assumptions) {
      const lower = assumption.toLowerCase();
      for (const word of FORBIDDEN) {
        expect(lower).not.toContain(word);
      }
    }
  });

  it("net APY is never negative when fees are high", () => {
    const aggressive: VaultDraft = {
      ...BASE_DRAFT,
      targetApyLowBps: 100,   // 1%
      targetApyHighBps: 200,  // 2%
      mgmtFeeBps: 500,        // 5% drag — exceeds gross
      perfFeeBps: 3000,
    };
    const result = projectVaultApy(aggressive);
    expect(result.apyLow).toBeGreaterThanOrEqual(0);
    expect(result.apyHigh).toBeGreaterThan(result.apyLow);
  });

  it("minimum spread of 0.1% is enforced even when perf fee kills the spread", () => {
    const flatDraft: VaultDraft = {
      ...BASE_DRAFT,
      targetApyLowBps: 800,
      targetApyHighBps: 800,  // zero gross spread
      mgmtFeeBps: 0,
      perfFeeBps: 0,
    };
    const result = projectVaultApy(flatDraft);
    // Floating-point arithmetic means the spread may be 0.09999… rather than
    // exactly 0.1; use a 1-decimal-place tolerance.
    expect(result.apyHigh - result.apyLow).toBeGreaterThanOrEqual(0.09);
  });
});
