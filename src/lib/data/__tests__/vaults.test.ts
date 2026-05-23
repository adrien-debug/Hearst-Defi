import { describe, it, expect, vi } from "vitest";

// Mock the Prisma client so the loader hits its fixture path (no DB rows).
vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDeployment: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    vaultSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));

import { listVaults, getVault } from "@/lib/data/vaults";
import {
  VAULT_DEFENSIVE,
  VAULT_BTC_PLUS,
  VAULT_YIELD,
} from "@/lib/engine/vaults";

describe("listVaults (multi-vault, ADR-006)", () => {
  it("returns the three vault fixtures when the DB has no deployments", async () => {
    const vaults = await listVaults();
    expect(vaults).toHaveLength(3);
    const names = vaults.map((v) => v.name);
    expect(names).toContain(VAULT_YIELD.label);
    expect(names).toContain(VAULT_DEFENSIVE.label);
    expect(names).toContain(VAULT_BTC_PLUS.label);
  });

  it("derives each fixture's APY band from its engine preset (range, never a point)", async () => {
    const vaults = await listVaults();
    const defensive = vaults.find((v) => v.name === VAULT_DEFENSIVE.label);
    const btcPlus = vaults.find((v) => v.name === VAULT_BTC_PLUS.label);
    expect(defensive?.apyLow).toBe(VAULT_DEFENSIVE.apyTarget.low);
    expect(defensive?.apyHigh).toBe(VAULT_DEFENSIVE.apyTarget.high);
    expect(btcPlus?.apyLow).toBe(VAULT_BTC_PLUS.apyTarget.low);
    expect(btcPlus?.apyHigh).toBe(VAULT_BTC_PLUS.apyTarget.high);
    // Range invariant (#1): low strictly below high for every vault.
    for (const v of vaults) expect(v.apyLow).toBeLessThan(v.apyHigh);
  });

  it("maps allocation targets to basis points summing to 10000", async () => {
    const vaults = await listVaults();
    for (const v of vaults) {
      const sum =
        v.targetMiningBps +
        v.targetBtcTacticalBps +
        v.targetUsdcBaseBps +
        v.targetStableReserveBps;
      expect(sum).toBe(10_000);
    }
  });

  it("pins each vault to its OWN id and ticker — no silent reuse (ADR-006 #9)", async () => {
    const vaults = await listVaults();
    const yieldVault = vaults.find((v) => v.id === "hearst-yield-vault");
    const defensive = vaults.find((v) => v.id === "hearst-defensive-vault");
    const btcPlus = vaults.find((v) => v.id === "hearst-btc-plus-vault");

    expect(yieldVault?.ticker).toBe("HYV-A");
    expect(defensive?.ticker).toBe("HDV-A");
    expect(btcPlus?.ticker).toBe("HBP-A");

    // No two vaults share the same ticker, name, or apy range (a silent reuse
    // would surface here as a duplicate triple).
    const triples = vaults.map((v) => `${v.ticker}|${v.name}|${v.apyLow}-${v.apyHigh}`);
    expect(new Set(triples).size).toBe(vaults.length);
  });

  it("returns identical fixtures across repeated calls (idempotent)", async () => {
    const a = await listVaults();
    const b = await listVaults();
    expect(a).toEqual(b);
    expect(a.map((v) => v.id)).toEqual(b.map((v) => v.id));
  });
});

describe("getVault (multi-vault resolution)", () => {
  it("resolves the Defensive vault by id and ticker", async () => {
    const byId = await getVault("hearst-defensive-vault");
    const byTicker = await getVault("HDV-A");
    expect(byId?.name).toBe(VAULT_DEFENSIVE.label);
    expect(byTicker?.name).toBe(VAULT_DEFENSIVE.label);
  });

  it("resolves the BTC Plus vault by id", async () => {
    const v = await getVault("hearst-btc-plus-vault");
    expect(v?.name).toBe(VAULT_BTC_PLUS.label);
    expect(v?.apyHigh).toBe(VAULT_BTC_PLUS.apyTarget.high);
  });

  it("returns null for an unknown vault id", async () => {
    expect(await getVault("nope-vault")).toBeNull();
  });
});
