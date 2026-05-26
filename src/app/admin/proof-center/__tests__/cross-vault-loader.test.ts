/**
 * Tests for the cross-vault proof-center loader logic.
 *
 * Verifies that `listAllVaults` correctly aggregates fixtures + deployments and
 * that the scope-label / active-vault resolution logic (as used in
 * src/app/admin/proof-center/page.tsx) derives the right values.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoist mocks before the imports that use them (Vitest requirement)
// ---------------------------------------------------------------------------
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

import {
  listAllVaults,
  resolveVault,
  vaultSlug,
  vaultLabel,
} from "@/lib/vaults/resolver";
import {
  VAULT_YIELD,
  VAULT_DEFENSIVE,
  VAULT_BTC_PLUS,
} from "@/lib/engine/vaults";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LIVE_DEPLOYMENT = {
  id: "cmx_live_deploy_001",
  ticker: "HYV-B",
  name: "Hearst Yield Vault — Series B",
  status: "live",
  updatedAt: new Date("2026-05-26T12:00:00Z"),
} as const;

const PAUSED_DEPLOYMENT = {
  id: "cmx_paused_deploy_001",
  ticker: "HDP-A",
  name: "Hearst Defensive Vault — Series A (Paused)",
  status: "paused",
  updatedAt: new Date("2026-05-20T08:00:00Z"),
} as const;

beforeEach(() => {
  findFirstMock.mockReset();
  findManyMock.mockReset();
  findManyMock.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// Cross-vault aggregation: listAllVaults
// ---------------------------------------------------------------------------

describe("cross-vault loader — listAllVaults", () => {
  it("returns exactly the 3 engine fixtures when no deployments exist", async () => {
    const refs = await listAllVaults({ status: "live-or-paused" });
    expect(refs).toHaveLength(3);
    expect(refs.every((r) => r.kind === "fixture")).toBe(true);
  });

  it("includes live deployments alongside fixtures (status=live)", async () => {
    findManyMock.mockResolvedValueOnce([LIVE_DEPLOYMENT]);
    const refs = await listAllVaults({ status: "live" });
    expect(refs).toHaveLength(4);
    const deployment = refs.find((r) => r.kind === "deployment");
    expect(deployment?.kind === "deployment" && deployment.deployment.ticker).toBe("HYV-B");
  });

  it("includes paused deployments when status=live-or-paused", async () => {
    findManyMock.mockResolvedValueOnce([LIVE_DEPLOYMENT, PAUSED_DEPLOYMENT]);
    const refs = await listAllVaults({ status: "live-or-paused" });
    const deploymentTickers = refs
      .filter((r) => r.kind === "deployment")
      .map((r) => r.kind === "deployment" && r.deployment.ticker);
    expect(deploymentTickers).toContain("HYV-B");
    expect(deploymentTickers).toContain("HDP-A");
  });

  it("fixtures always come before deployments in returned order", async () => {
    findManyMock.mockResolvedValueOnce([LIVE_DEPLOYMENT]);
    const refs = await listAllVaults({ status: "live" });
    const firstThree = refs.slice(0, 3);
    expect(firstThree.every((r) => r.kind === "fixture")).toBe(true);
    expect(refs[3]?.kind).toBe("deployment");
  });

  it("fixtures follow canonical order: yield → defensive → btc-plus", async () => {
    const refs = await listAllVaults({ status: "any" });
    const fixtures = refs.filter((r) => r.kind === "fixture");
    expect(fixtures[0]?.kind === "fixture" && fixtures[0].fixture.id).toBe(VAULT_YIELD.id);
    expect(fixtures[1]?.kind === "fixture" && fixtures[1].fixture.id).toBe(VAULT_DEFENSIVE.id);
    expect(fixtures[2]?.kind === "fixture" && fixtures[2].fixture.id).toBe(VAULT_BTC_PLUS.id);
  });

  it("suppresses deployment whose ticker collides with a fixture ticker", async () => {
    // HYV is the canonical ticker for the Yield fixture — a deployment sharing
    // it should be hidden to keep the fixture canonical.
    findManyMock.mockResolvedValueOnce([
      { ...LIVE_DEPLOYMENT, ticker: "HYV" }, // collision
      LIVE_DEPLOYMENT,                        // distinct ticker — kept
    ]);
    const refs = await listAllVaults({ status: "live" });
    const deployments = refs.filter((r) => r.kind === "deployment");
    expect(deployments).toHaveLength(1);
    expect(
      deployments[0]?.kind === "deployment" && deployments[0].deployment.ticker,
    ).toBe("HYV-B");
  });

  it("passes status=live-or-paused as IN filter to Prisma", async () => {
    await listAllVaults({ status: "live-or-paused" });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { status: { in: ["live", "paused"] } },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("passes status=any as undefined where clause to Prisma", async () => {
    await listAllVaults({ status: "any" });
    expect(findManyMock).toHaveBeenCalledWith({
      where: undefined,
      orderBy: { updatedAt: "desc" },
    });
  });
});

// ---------------------------------------------------------------------------
// Vault selector options derivation (mirrors page.tsx logic)
// ---------------------------------------------------------------------------

describe("vault options derivation for proof-center selector", () => {
  it("builds options list with fixture slugs + labels", async () => {
    const refs = await listAllVaults({ status: "live-or-paused" });
    const options = refs.map((ref) => ({
      id: vaultSlug(ref),
      label: vaultLabel(ref),
    }));
    // All three fixture slugs must appear
    expect(options.map((o) => o.id)).toContain("yield");
    expect(options.map((o) => o.id)).toContain("defensive");
    expect(options.map((o) => o.id)).toContain("btc-plus");
  });

  it("includes deployment in options with lowercased ticker as id", async () => {
    findManyMock.mockResolvedValueOnce([LIVE_DEPLOYMENT]);
    const refs = await listAllVaults({ status: "live-or-paused" });
    const options = refs.map((ref) => ({
      id: vaultSlug(ref),
      label: vaultLabel(ref),
    }));
    const deploymentOption = options.find((o) => o.id === "hyv-b");
    expect(deploymentOption).toBeDefined();
    expect(deploymentOption?.label).toBe("Hearst Yield Vault — Series B");
  });
});

// ---------------------------------------------------------------------------
// Active vault / scope label resolution (mirrors page.tsx logic)
// ---------------------------------------------------------------------------

describe("active vault resolution — scope label logic", () => {
  it("defaults to 'yield' when no vault param is given (all-vaults view)", async () => {
    // Mirrors: requestedVault = undefined → resolvedRef = null → activeVaultId = "yield"
    const requestedVault: string | undefined = undefined;
    const resolvedRef = requestedVault ? await resolveVault(requestedVault) : null;
    const activeVaultId = resolvedRef ? vaultSlug(resolvedRef) : "yield";
    const isAllVaults = !requestedVault;
    expect(activeVaultId).toBe("yield");
    expect(isAllVaults).toBe(true);
  });

  it("resolves a fixture vault by id and sets isAllVaults=false", async () => {
    const requestedVault = "defensive";
    const resolvedRef = await resolveVault(requestedVault);
    const activeVaultId = resolvedRef ? vaultSlug(resolvedRef) : "yield";
    const isAllVaults = !requestedVault;
    expect(activeVaultId).toBe("defensive");
    expect(isAllVaults).toBe(false);
  });

  it("resolves a deployment by ticker and returns its lowercased slug", async () => {
    findFirstMock.mockResolvedValueOnce(LIVE_DEPLOYMENT);
    const requestedVault = "hyv-b";
    const resolvedRef = await resolveVault(requestedVault);
    const activeVaultId = resolvedRef ? vaultSlug(resolvedRef) : "yield";
    expect(activeVaultId).toBe("hyv-b");
  });

  it("falls back to 'yield' activeVaultId when resolveVault returns null", async () => {
    findFirstMock.mockResolvedValueOnce(null);
    const requestedVault = "nonexistent-vault";
    const resolvedRef = await resolveVault(requestedVault);
    const activeVaultId = resolvedRef ? vaultSlug(resolvedRef) : "yield";
    expect(resolvedRef).toBeNull();
    expect(activeVaultId).toBe("yield");
  });
});
