import { describe, it, expect, vi } from "vitest";

// Mock the Prisma client. No DB rows.
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

describe("listVaults — empty-DB contract", () => {
  it("returns an empty array when the DB has no VaultDeployment rows (no fabricated fixtures)", async () => {
    const vaults = await listVaults();
    expect(vaults).toEqual([]);
  });

  it("is idempotent across repeated calls", async () => {
    const a = await listVaults();
    const b = await listVaults();
    expect(a).toEqual(b);
  });
});

describe("getVault — empty-DB contract", () => {
  it("returns null for any id when the DB has no matching row", async () => {
    expect(await getVault("hearst-yield-vault")).toBeNull();
    expect(await getVault("hearst-defensive-vault")).toBeNull();
    expect(await getVault("HBP-A")).toBeNull();
  });

  it("returns null for an unknown vault id", async () => {
    expect(await getVault("nope-vault")).toBeNull();
  });
});
