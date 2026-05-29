import { describe, it, expect, vi } from "vitest";

// B3 — when the DB has no MiningMetric rows, the ops snapshot is a fallback and
// MUST be flagged so the investor-memo PDF badges it `estimated`, not `attested`.

vi.mock("@/lib/db", () => ({
  prisma: {
    miningMetric: { findMany: vi.fn().mockResolvedValue([]) },
    proof: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/data/hashprice", () => ({
  fetchHashprice: vi.fn().mockResolvedValue({
    usd_per_th_day: 0,
    stale: true,
  }),
}));

import { loadMiningOpsSnapshot } from "@/lib/agents/loaders/mining";

describe("loadMiningOpsSnapshot — fallback flagging (B3)", () => {
  it("sets is_fallback=true when there are no operator rows", async () => {
    const snap = await loadMiningOpsSnapshot();
    expect(snap.is_fallback).toBe(true);
  });
});
