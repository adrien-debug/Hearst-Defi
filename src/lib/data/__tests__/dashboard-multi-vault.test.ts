import { describe, expect, it, vi } from "vitest";

// Mock the Prisma client so the loader degrades to its fallback path. The
// loader still runs the full code path (including the vault metadata
// projection); only the DB-bound branches degrade to empty.
vi.mock("@/lib/db", () => ({
  prisma: {
    vaultSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    rebalanceEvent: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    miningMetric: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    distribution: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    proof: {
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

// Stub the BTC price fetch so the loader does not hit the network.
vi.mock("@/lib/data/btc-price", () => ({
  fetchBtcPrice: vi.fn().mockResolvedValue({
    spot_usd: 96_000,
    pct_change_24h: 0,
    pct_change_30d: 0,
    fetched_at: new Date().toISOString(),
    source: "fallback",
  }),
}));

// Stub the hashprice fetch (used transitively by the mining loader). Returns a
// stale snapshot so the loader takes its fallback branch without throwing on a
// null `usd_per_th_day` field.
vi.mock("@/lib/data/hashprice", () => ({
  fetchHashprice: vi.fn().mockResolvedValue({
    usd_per_th_day: 0,
    btc_price_usd: 0,
    network_hashrate_eh: 0,
    network_difficulty: 0,
    block_reward_btc: 0,
    fees_pct_of_reward: 0,
    fetched_at: new Date().toISOString(),
    source: "fallback",
    stale: true,
  }),
}));

import { loadDashboardData } from "@/lib/data/dashboard";
import {
  VAULT_BTC_PLUS,
  VAULT_DEFENSIVE,
  VAULT_YIELD,
} from "@/lib/engine/vaults";

describe("loadDashboardData multi-vault metadata (ADR-006 #9)", () => {
  it("defaults to the Hearst Yield Vault preset when no id is passed", async () => {
    const data = await loadDashboardData();
    expect(data.vaultMeta.id).toBe(VAULT_YIELD.id);
    expect(data.vaultMeta.name).toBe(VAULT_YIELD.label);
    expect(data.vaultMeta.apyTarget.low).toBe(VAULT_YIELD.apyTarget.low);
    expect(data.vaultMeta.apyTarget.high).toBe(VAULT_YIELD.apyTarget.high);
    expect(data.vaultMeta.livePreview).toBe(false);
  });

  it("returns the Defensive Vault metadata when vaultId=defensive", async () => {
    const data = await loadDashboardData("defensive");
    expect(data.vaultMeta.id).toBe(VAULT_DEFENSIVE.id);
    expect(data.vaultMeta.name).toBe(VAULT_DEFENSIVE.label);
    expect(data.vaultMeta.apyTarget).toEqual({
      low: VAULT_DEFENSIVE.apyTarget.low,
      high: VAULT_DEFENSIVE.apyTarget.high,
    });
    expect(data.vaultMeta.allocationTargets).toEqual(
      VAULT_DEFENSIVE.allocationTargets,
    );
    // Live KPIs are not yet per-vault — preview flag must be ON so the UI can
    // label them as such (ADR-006 #9).
    expect(data.vaultMeta.livePreview).toBe(true);
  });

  it("returns the BTC Plus Vault metadata when vaultId=btc-plus", async () => {
    const data = await loadDashboardData("btc-plus");
    expect(data.vaultMeta.id).toBe(VAULT_BTC_PLUS.id);
    expect(data.vaultMeta.name).toBe(VAULT_BTC_PLUS.label);
    expect(data.vaultMeta.apyTarget.high).toBe(VAULT_BTC_PLUS.apyTarget.high);
    expect(data.vaultMeta.livePreview).toBe(true);
  });

  it("falls back to the Yield Vault on an unknown id (no silent vault swap)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = await loadDashboardData("not-a-real-vault");
    expect(data.vaultMeta.id).toBe(VAULT_YIELD.id);
    expect(data.vaultMeta.livePreview).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("never mixes apy targets across vaults (idempotent per call)", async () => {
    const yield1 = await loadDashboardData("yield");
    const def1 = await loadDashboardData("defensive");
    const btc1 = await loadDashboardData("btc-plus");
    const yield2 = await loadDashboardData("yield");

    // Each vault keeps its OWN apy band on every call — no leakage from one
    // run to the next, no implicit "last vault wins".
    expect(yield1.vaultMeta.apyTarget).toEqual(yield2.vaultMeta.apyTarget);
    expect(def1.vaultMeta.apyTarget).not.toEqual(yield1.vaultMeta.apyTarget);
    expect(btc1.vaultMeta.apyTarget).not.toEqual(yield1.vaultMeta.apyTarget);
    expect(def1.vaultMeta.apyTarget).not.toEqual(btc1.vaultMeta.apyTarget);
  });
});
