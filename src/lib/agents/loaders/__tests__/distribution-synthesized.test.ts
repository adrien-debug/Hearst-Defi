import { describe, it, expect, vi } from "vitest";

// B4 — when no Distribution row exists, the loader synthesises a scheduled
// entry. It MUST be flagged `synthesized` so LP surfaces label it indicative
// rather than presenting it as a committed/executed payout.

const findFirstDistribution = vi.fn();
const findFirstSnapshot = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    distribution: { findFirst: (...a: unknown[]) => findFirstDistribution(...a) },
    vaultSnapshot: { findFirst: (...a: unknown[]) => findFirstSnapshot(...a) },
  },
}));

import { loadLatestDistribution } from "@/lib/agents/loaders/distribution";

describe("loadLatestDistribution — synthesized flag (B4)", () => {
  it("flags the fallback as synthesized when the DB has no distribution", async () => {
    findFirstDistribution.mockResolvedValueOnce(null);
    findFirstSnapshot.mockResolvedValueOnce({ aumUsdc: { toNumber: () => 25_000_000 } });
    const snap = await loadLatestDistribution();
    expect(snap.synthesized).toBe(true);
    expect(snap.status).toBe("scheduled");
  });

  it("does NOT flag a real DB row as synthesized", async () => {
    findFirstDistribution.mockResolvedValueOnce({
      distributedAt: new Date(),
      amountUsdc: { toNumber: () => 200_000 },
      period: "2026-05",
      txHash: "0xrealhash",
    });
    const snap = await loadLatestDistribution();
    expect(snap.synthesized).toBeUndefined();
    expect(snap.status).toBe("paid");
  });
});

// B4 — admin badge logic: a simulated 0xMOCK hash is never "attested".
function distributionBadgeKind(txHash: string | null): string {
  if (!txHash) return "manual";
  return txHash.startsWith("0xMOCK") ? "estimated" : "attested";
}

describe("distribution badge — mock hash is not attested (B4)", () => {
  it("badges a 0xMOCK hash as estimated, not attested", () => {
    expect(distributionBadgeKind("0xMOCK_abc")).toBe("estimated");
  });
  it("badges a real hash as attested", () => {
    expect(distributionBadgeKind("0x9f8e7d6c")).toBe("attested");
  });
  it("badges no hash as manual", () => {
    expect(distributionBadgeKind(null)).toBe("manual");
  });
});
