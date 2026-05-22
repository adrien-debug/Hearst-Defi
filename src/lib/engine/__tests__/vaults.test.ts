import { describe, expect, it } from "vitest";
import {
  getVaultDefinition,
  vaultAllocationWeights,
  VAULT_BTC_PLUS,
  VAULT_DEFENSIVE,
  VAULT_YIELD,
  VAULTS,
  type VaultDefinition,
} from "../vaults";
import type { VaultId } from "../types";

const ALL: VaultDefinition[] = [VAULT_YIELD, VAULT_DEFENSIVE, VAULT_BTC_PLUS];

function allocationSum(v: VaultDefinition): number {
  const t = v.allocationTargets;
  return t.mining + t.btc_tactical + t.usdc_base + t.stable_reserve;
}

describe("vault presets", () => {
  it("registers the three presets under their ids", () => {
    expect(VAULTS.yield).toBe(VAULT_YIELD);
    expect(VAULTS.defensive).toBe(VAULT_DEFENSIVE);
    expect(VAULTS["btc-plus"]).toBe(VAULT_BTC_PLUS);
    expect(Object.keys(VAULTS)).toHaveLength(3);
  });

  it("expresses every APY target as a range with low < high", () => {
    for (const v of ALL) {
      expect(v.apyTarget.low).toBeLessThan(v.apyTarget.high);
      expect(v.apyTarget.low).toBeGreaterThanOrEqual(0);
    }
  });

  it("has allocation targets that sum to ~100%", () => {
    for (const v of ALL) {
      expect(allocationSum(v)).toBeCloseTo(100, 6);
    }
  });

  it("ships at least one share class per vault", () => {
    for (const v of ALL) {
      expect(v.shareClasses.length).toBeGreaterThan(0);
    }
  });

  it("keeps a methodology version on every vault", () => {
    for (const v of ALL) {
      expect(v.methodologyVersion).toMatch(/^v\d/);
    }
  });
});

describe("getVaultDefinition", () => {
  it("returns the matching preset", () => {
    expect(getVaultDefinition("yield")).toBe(VAULT_YIELD);
    expect(getVaultDefinition("defensive")).toBe(VAULT_DEFENSIVE);
    expect(getVaultDefinition("btc-plus")).toBe(VAULT_BTC_PLUS);
  });

  it("throws for an unknown id", () => {
    expect(() => getVaultDefinition("ghost" as VaultId)).toThrow(/unknown vault id/);
  });
});

describe("assumption sanity (ADR-006: no vault reuses another's numbers)", () => {
  it("Defensive targets a lower APY band than BTC Plus", () => {
    expect(VAULT_DEFENSIVE.apyTarget.low).toBeLessThan(VAULT_BTC_PLUS.apyTarget.low);
    expect(VAULT_DEFENSIVE.apyTarget.high).toBeLessThan(VAULT_BTC_PLUS.apyTarget.high);
  });

  it("Defensive holds mining in the 15-25% band; BTC Plus tilts to BTC tactical", () => {
    expect(VAULT_DEFENSIVE.allocationTargets.mining).toBeGreaterThanOrEqual(15);
    expect(VAULT_DEFENSIVE.allocationTargets.mining).toBeLessThanOrEqual(25);
    expect(VAULT_BTC_PLUS.allocationTargets.btc_tactical).toBeGreaterThan(
      VAULT_YIELD.allocationTargets.btc_tactical,
    );
  });

  it("Defensive carries more stable reserve than BTC Plus", () => {
    expect(VAULT_DEFENSIVE.allocationTargets.stable_reserve).toBeGreaterThan(
      VAULT_BTC_PLUS.allocationTargets.stable_reserve,
    );
  });
});

describe("vaultAllocationWeights", () => {
  it("converts a vault's targets into V2 weights summing to 1.0", () => {
    for (const v of ALL) {
      const w = vaultAllocationWeights(v);
      const sum = w.mining + w.btcTactical + w.usdcBase + w.stableReserve;
      expect(sum).toBeCloseTo(1, 9);
    }
  });

  it("defaults to the Yield Vault when called with no argument (retro-compat)", () => {
    expect(vaultAllocationWeights()).toEqual(vaultAllocationWeights(VAULT_YIELD));
  });
});
