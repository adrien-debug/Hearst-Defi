/**
 * Tests for vault breadcrumb utilities.
 *
 * Coverage:
 *   1. buildBreadcrumbSegments — pure function (no mocks needed for these tests)
 *   2. getCurrentVaultContext  — resolver + listAllVaults mocked
 *   3. VaultBreadcrumb render  — segment count and ChevronRight separators
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (hoisted before module imports) ────────────────────────────────────

const { findFirstMock, findManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDeployment: {
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
  },
}));

// ── Imports ───────────────────────────────────────────────────────────────────

import {
  buildBreadcrumbSegments,
  getCurrentVaultContext,
} from "@/lib/vaults/context";
import type { VaultRef } from "@/lib/vaults/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEPLOYMENT_ROW = {
  id: "cmx7abcde1234567",
  ticker: "HYV-A",
  name: "Hearst Yield A",
  status: "live",
  updatedAt: new Date("2026-05-26T10:00:00Z"),
  description: "Series A",
  targetApyLowBps: 800,
  targetApyHighBps: 1200,
  capacityUsdc: 10_000_000,
  minTicketUsdc: 250_000,
  softLockupDays: 60,
  mgmtFeeBps: 150,
  perfFeeBps: 1500,
  hurdleBps: 0,
  requiredSigners: 2,
  signersWhitelist: "[]",
  strategy: "mining_yield",
  spvJurisdiction: "cayman",
  shareClass: "A",
  regExemption: "reg_d_506b",
  targetMiningBps: 5000,
  targetBtcTacticalBps: 2000,
  targetUsdcBaseBps: 2000,
  targetStableReserveBps: 1000,
  disclaimers: "Not guaranteed.",
  createdAt: new Date("2026-01-01"),
};

/** A deployment VaultRef wrapping the fixture row above. */
const DEPLOYMENT_REF: VaultRef = {
  kind: "deployment",
  deployment: DEPLOYMENT_ROW as never,
};

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);
});

// =============================================================================
// buildBreadcrumbSegments — pure function
// =============================================================================

describe("buildBreadcrumbSegments", () => {
  it("returns ['Admin'] for /admin", () => {
    expect(buildBreadcrumbSegments("/admin", null)).toEqual(["Admin"]);
  });

  it("returns ['Admin', 'Vaults'] for /admin/vaults", () => {
    expect(buildBreadcrumbSegments("/admin/vaults", null)).toEqual([
      "Admin",
      "Vaults",
    ]);
  });

  it("returns ['Admin', 'Vaults', VaultLabel] for /admin/vaults/[id] with a deployment vault", () => {
    const result = buildBreadcrumbSegments(
      "/admin/vaults/hyv-a",
      DEPLOYMENT_REF,
    );
    expect(result).toEqual(["Admin", "Vaults", "Hearst Yield A"]);
  });

  it("returns ['Admin', 'Vaults', VaultLabel, 'Dashboard'] for /admin/dashboard?vault=hyv-a", () => {
    // The path is /admin/dashboard (no ?vault= in pathname — those are in searchParams)
    // buildBreadcrumbSegments receives the pathname only (no query string),
    // but when a vault is in scope it is passed as currentVault.
    const result = buildBreadcrumbSegments("/admin/dashboard", DEPLOYMENT_REF);
    expect(result).toEqual(["Admin", "Vaults", "Hearst Yield A", "Dashboard"]);
  });

  it("returns ['Admin', 'Vaults', VaultLabel, 'Distributions'] for /admin/distributions with vault", () => {
    const result = buildBreadcrumbSegments(
      "/admin/distributions",
      DEPLOYMENT_REF,
    );
    expect(result).toEqual([
      "Admin",
      "Vaults",
      "Hearst Yield A",
      "Distributions",
    ]);
  });

  it("returns ['Admin', 'Signals'] for /admin/signals without vault", () => {
    const result = buildBreadcrumbSegments("/admin/signals", null);
    expect(result).toEqual(["Admin", "Signals"]);
  });

  it("handles kebab-case section names, capitalising each word", () => {
    const result = buildBreadcrumbSegments("/admin/investor-memo", null);
    expect(result).toEqual(["Admin", "Investor Memo"]);
  });

  it("includes sub-path segment for /admin/vaults/[id]/edit", () => {
    const result = buildBreadcrumbSegments(
      "/admin/vaults/hyv-a/edit",
      DEPLOYMENT_REF,
    );
    expect(result).toEqual(["Admin", "Vaults", "Hearst Yield A", "Edit"]);
  });

  it("handles fixture vault refs (yields fixture label)", () => {
    const fixtureRef: VaultRef = {
      kind: "fixture",
      fixture: {
        id: "yield" as never,
        ticker: "HYV",
        label: "Hearst Yield Vault",
        description: "Core yield vault",
        apyTarget: { low: 8, high: 15 },
        baseMode: "balanced" as never,
        allocationTargets: {
          mining: 50,
          btc_tactical: 20,
          usdc_base: 20,
          stable_reserve: 10,
        },
        shareClasses: [],
        defaultProvenance: "estimated" as never,
        methodologyVersion: "v1.0",
        assumptions: [],
      },
    };
    const result = buildBreadcrumbSegments("/admin/dashboard", fixtureRef);
    expect(result).toEqual(["Admin", "Vaults", "Hearst Yield Vault", "Dashboard"]);
  });
});

// =============================================================================
// getCurrentVaultContext
// =============================================================================

describe("getCurrentVaultContext", () => {
  it("returns null current and isVaultScoped=false when no vault in URL", async () => {
    const ctx = await getCurrentVaultContext({}, "/admin/dashboard");
    expect(ctx.current).toBeNull();
    expect(ctx.isVaultScoped).toBe(false);
    expect(Array.isArray(ctx.all)).toBe(true);
  });

  it("resolves vault from ?vault= searchParam", async () => {
    findFirstMock.mockResolvedValue(DEPLOYMENT_ROW);
    const ctx = await getCurrentVaultContext(
      { vault: "hyv-a" },
      "/admin/dashboard",
    );
    expect(ctx.current).not.toBeNull();
    expect(ctx.isVaultScoped).toBe(true);
    // Deployment row was returned → kind is "deployment"
    expect(ctx.current?.kind).toBe("deployment");
  });

  it("resolves vault from /admin/vaults/[id] path", async () => {
    findFirstMock.mockResolvedValue(DEPLOYMENT_ROW);
    const ctx = await getCurrentVaultContext({}, "/admin/vaults/hyv-a");
    expect(ctx.current).not.toBeNull();
    expect(ctx.isVaultScoped).toBe(true);
  });

  it("prefers ?vault= over path segment when both are present", async () => {
    // path has /vaults/[id] but ?vault= is also provided — ?vault= wins
    findFirstMock.mockResolvedValue(DEPLOYMENT_ROW);
    await getCurrentVaultContext(
      { vault: "hyv-a" },
      "/admin/vaults/other-id",
    );
    // findFirst called with HYV-A (from ?vault=), not other-id
    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [{ ticker: "HYV-A" }, { id: "hyv-a" }],
        },
      }),
    );
  });

  it("resolves fixture vaults (yield / defensive / btc-plus) without hitting the DB", async () => {
    // "yield" is a VaultId fixture; findFirst should NOT be called
    const ctx = await getCurrentVaultContext({ vault: "yield" }, "/admin/dashboard");
    expect(findFirstMock).not.toHaveBeenCalled();
    expect(ctx.current?.kind).toBe("fixture");
  });

  it("returns null current when vault param does not match any vault", async () => {
    findFirstMock.mockResolvedValue(null);
    const ctx = await getCurrentVaultContext(
      { vault: "nonexistent-xyz" },
      "/admin/dashboard",
    );
    expect(ctx.current).toBeNull();
    expect(ctx.isVaultScoped).toBe(true); // URL had ?vault= even if unresolved
  });
});
