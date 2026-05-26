/**
 * Unit tests for getVaultReturns — tests the pure computation logic via
 * the helper functions extracted from returns.ts, plus a mocked Prisma layer.
 *
 * We test the data-transformation layer (bucketing + return calculation)
 * independently of the database by mocking prisma.vaultSnapshot.findMany.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mock Prisma before importing the module under test ────────────────────────
vi.mock("@/lib/db", () => ({
  prisma: {
    vaultSnapshot: {
      findMany: vi.fn(),
    },
  },
}));

// Also mock server-only so it doesn't throw in Node test env.
// (vitest.config.ts already aliases server-only → empty.js, so this is belt-and-suspenders.)

import { prisma } from "@/lib/db";
import { getVaultReturns } from "../returns";

// Cast so TypeScript accepts .mockResolvedValue on the Vitest mock
const mockFindMany = prisma.vaultSnapshot.findMany as ReturnType<typeof vi.fn>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal VaultSnapshot row shape matching what getVaultReturns selects. */
function snap(dateStr: string, aumUsdc: number) {
  // Prisma Decimal fields are serialized as a Decimal object, but Number(decimalObj)
  // works correctly. We cast via unknown to satisfy the type without importing
  // the Decimal class directly (which may not be re-exported by the generated client).
  return { takenAt: new Date(dateStr), aumUsdc: aumUsdc as unknown as { valueOf(): number; toString(): string } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("getVaultReturns — empty DB", () => {
  it("returns source='fallback' with empty returns when no snapshots", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getVaultReturns("vault-1", "12m");
    expect(result.source).toBe("fallback");
    expect(result.returns).toHaveLength(0);
    expect(result.vaultId).toBe("vault-1");
    expect(result.period).toBe("12m");
  });
});

describe("getVaultReturns — single month", () => {
  it("returns source='partial' when only one distinct month exists", async () => {
    mockFindMany.mockResolvedValue([
      snap("2026-01-05T00:00:00Z", 1_000_000),
      snap("2026-01-20T00:00:00Z", 1_010_000),
    ]);
    const result = await getVaultReturns("vault-1", "12m");
    expect(result.source).toBe("partial");
    expect(result.returns).toHaveLength(0);
  });
});

describe("getVaultReturns — correct return computation", () => {
  it("computes correct simple return from two month-end NAVs", async () => {
    // Jan NAV (last snap) = 1_000_000; Feb NAV = 1_010_000
    // Expected return = 1_010_000 / 1_000_000 - 1 = 0.01
    mockFindMany.mockResolvedValue([
      snap("2026-01-31T23:00:00Z", 1_000_000),
      snap("2026-02-28T23:00:00Z", 1_010_000),
    ]);
    const result = await getVaultReturns("vault-1", "all");
    expect(result.returns).toHaveLength(1);
    expect(result.returns[0]!.returnDecimal).toBeCloseTo(0.01, 10);
    expect(result.returns[0]!.period).toBe("2026-02");
    expect(result.returns[0]!.navUsdc).toBe(1_010_000);
  });

  it("uses the last snapshot within a month as end-of-month NAV", async () => {
    // Two snaps in Jan; the later one (1_020_000) should be used as Jan's NAV.
    mockFindMany.mockResolvedValue([
      snap("2026-01-10T00:00:00Z", 980_000),
      snap("2026-01-25T00:00:00Z", 1_020_000), // should win
      snap("2026-02-28T00:00:00Z", 1_040_400), // Feb NAV
    ]);
    const result = await getVaultReturns("vault-1", "all");
    expect(result.returns).toHaveLength(1);
    // return = 1_040_400 / 1_020_000 - 1 = 0.02
    expect(result.returns[0]!.returnDecimal).toBeCloseTo(0.02, 8);
  });

  it("computes multiple monthly returns correctly", async () => {
    // Jan=1M, Feb=1.01M, Mar=1.0201M, Apr=1.030301M (+1% each month)
    mockFindMany.mockResolvedValue([
      snap("2026-01-31T00:00:00Z", 1_000_000),
      snap("2026-02-28T00:00:00Z", 1_010_000),
      snap("2026-03-31T00:00:00Z", 1_020_100),
      snap("2026-04-30T00:00:00Z", 1_030_301),
    ]);
    const result = await getVaultReturns("vault-1", "all");
    expect(result.returns).toHaveLength(3);
    for (const r of result.returns) {
      expect(r.returnDecimal).toBeCloseTo(0.01, 4);
    }
  });

  it("trims to the most recent N months for period='3m'", async () => {
    mockFindMany.mockResolvedValue([
      snap("2026-01-31T00:00:00Z", 1_000_000),
      snap("2026-02-28T00:00:00Z", 1_010_000),
      snap("2026-03-31T00:00:00Z", 1_020_100),
      snap("2026-04-30T00:00:00Z", 1_030_301),
      snap("2026-05-31T00:00:00Z", 1_040_604),
    ]);
    const result = await getVaultReturns("vault-1", "3m");
    expect(result.returns).toHaveLength(3);
    // The last 3 return periods should be Feb, Mar, Apr, May → last 3 = Mar, Apr, May
    const periods = result.returns.map((r) => r.period);
    expect(periods).toContain("2026-05");
    expect(periods).toContain("2026-04");
    expect(periods).toContain("2026-03");
    expect(periods).not.toContain("2026-02");
  });

  it("returns source='partial' when fewer periods than requested are available", async () => {
    mockFindMany.mockResolvedValue([
      snap("2026-04-30T00:00:00Z", 1_000_000),
      snap("2026-05-31T00:00:00Z", 1_010_000),
    ]);
    const result = await getVaultReturns("vault-1", "12m");
    // Only 1 return computed, requested 12 → partial
    expect(result.source).toBe("partial");
    expect(result.returns).toHaveLength(1);
  });

  it("returns source='live' when enough data covers the full period", async () => {
    // Build 13 months of data → 12 monthly returns
    const snaps = [];
    let nav = 1_000_000;
    for (let m = 1; m <= 13; m++) {
      const month = String(m).padStart(2, "0");
      snaps.push(snap(`2025-${month}-28T00:00:00Z`, nav));
      nav = Math.round(nav * 1.01);
    }
    mockFindMany.mockResolvedValue(snaps);
    const result = await getVaultReturns("vault-1", "12m");
    expect(result.source).toBe("live");
    expect(result.returns).toHaveLength(12);
  });
});

describe("getVaultReturns — period='1m'", () => {
  it("returns only the most recent 1 return", async () => {
    mockFindMany.mockResolvedValue([
      snap("2026-03-31T00:00:00Z", 1_000_000),
      snap("2026-04-30T00:00:00Z", 1_010_000),
      snap("2026-05-31T00:00:00Z", 1_020_100),
    ]);
    const result = await getVaultReturns("vault-1", "1m");
    expect(result.returns).toHaveLength(1);
    expect(result.returns[0]!.period).toBe("2026-05");
  });
});

describe("getVaultReturns — period='all'", () => {
  it("returns all computed returns regardless of count", async () => {
    mockFindMany.mockResolvedValue([
      snap("2026-01-31T00:00:00Z", 1_000_000),
      snap("2026-02-28T00:00:00Z", 1_010_000),
      snap("2026-03-31T00:00:00Z", 1_020_100),
    ]);
    const result = await getVaultReturns("vault-1", "all");
    expect(result.returns).toHaveLength(2);
    expect(result.period).toBe("all");
  });
});
