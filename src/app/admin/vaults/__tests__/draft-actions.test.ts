/**
 * Unit tests for src/app/admin/vaults/draft-actions.ts
 *
 * Coverage:
 *   1. saveWizardStep — creates a new draft when none exists
 *   2. saveWizardStep — merges partial on top of existing draft
 *   3. loadWizardDraft — returns null when no draft
 *   4. loadWizardDraft — returns the draft row when present
 *   5. discardWizardDraft — calls deleteMany for the admin user
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDraft: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import {
  saveWizardStep,
  loadWizardDraft,
  discardWizardDraft,
} from "../draft-actions";
import type { FormState } from "../_vault-form";

// ── Helpers ────────────────────────────────────────────────────────────────

const USER_ID = "user_admin_001";

function mockAdmin() {
  vi.mocked(requireAdmin).mockResolvedValue({ userId: USER_ID });
}

function buildDraftRow(overrides: { formState?: string; step?: string } = {}) {
  return {
    id: "draft_cuid_001",
    userId: USER_ID,
    formState: overrides.formState ?? JSON.stringify({ ticker: "HYV-A" }),
    step: overrides.step ?? "identity",
    updatedAt: new Date("2026-05-26T10:00:00Z"),
    createdAt: new Date("2026-05-26T09:00:00Z"),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("saveWizardStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
  });

  it("creates a new draft when none exists", async () => {
    vi.mocked(prisma.vaultDraft.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.vaultDraft.upsert).mockResolvedValue(buildDraftRow() as never);

    const partial: Partial<FormState> = { ticker: "HYV-B", name: "Test Vault" };
    await saveWizardStep("economics", partial);

    expect(prisma.vaultDraft.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      create: {
        userId: USER_ID,
        formState: JSON.stringify(partial),
        step: "economics",
      },
      update: {
        formState: JSON.stringify(partial),
        step: "economics",
      },
    });
  });

  it("merges partial on top of existing draft state", async () => {
    const existing = buildDraftRow({
      formState: JSON.stringify({ ticker: "HYV-A", name: "Old Name", strategy: "mining_yield" }),
      step: "identity",
    });
    vi.mocked(prisma.vaultDraft.findUnique).mockResolvedValue(existing as never);
    vi.mocked(prisma.vaultDraft.upsert).mockResolvedValue(buildDraftRow() as never);

    const partial: Partial<FormState> = { name: "New Name", minTicketUsdc: 500000 };
    await saveWizardStep("economics", partial);

    const expectedMerged = {
      ticker: "HYV-A",
      name: "New Name",
      strategy: "mining_yield",
      minTicketUsdc: 500000,
    };

    expect(prisma.vaultDraft.upsert).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      create: {
        userId: USER_ID,
        formState: JSON.stringify(expectedMerged),
        step: "economics",
      },
      update: {
        formState: JSON.stringify(expectedMerged),
        step: "economics",
      },
    });
  });

  it("handles corrupted existing formState gracefully (falls back to partial only)", async () => {
    const corrupted = buildDraftRow({ formState: "NOT_JSON" });
    vi.mocked(prisma.vaultDraft.findUnique).mockResolvedValue(corrupted as never);
    vi.mocked(prisma.vaultDraft.upsert).mockResolvedValue(buildDraftRow() as never);

    const partial: Partial<FormState> = { ticker: "HYV-C" };
    await saveWizardStep("legal", partial);

    expect(prisma.vaultDraft.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          formState: JSON.stringify(partial),
          step: "legal",
        }),
      }),
    );
  });
});

describe("loadWizardDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
  });

  it("returns null when no draft exists", async () => {
    vi.mocked(prisma.vaultDraft.findUnique).mockResolvedValue(null);

    const result = await loadWizardDraft();

    expect(result).toBeNull();
    expect(prisma.vaultDraft.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("returns the draft row when present", async () => {
    const row = buildDraftRow({ step: "governance", formState: JSON.stringify({ ticker: "HYV-A" }) });
    vi.mocked(prisma.vaultDraft.findUnique).mockResolvedValue(row as never);

    const result = await loadWizardDraft();

    expect(result).not.toBeNull();
    expect(result!.step).toBe("governance");
    expect(result!.userId).toBe(USER_ID);
  });
});

describe("discardWizardDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdmin();
  });

  it("calls deleteMany scoped to current admin userId", async () => {
    vi.mocked(prisma.vaultDraft.deleteMany).mockResolvedValue({ count: 1 } as never);

    await discardWizardDraft();

    expect(prisma.vaultDraft.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.vaultDraft.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("does not throw when no draft exists (deleteMany count 0)", async () => {
    vi.mocked(prisma.vaultDraft.deleteMany).mockResolvedValue({ count: 0 } as never);

    await expect(discardWizardDraft()).resolves.toBeUndefined();
  });
});
