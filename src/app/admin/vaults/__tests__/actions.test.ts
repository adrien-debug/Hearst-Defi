/**
 * Unit tests for src/app/admin/vaults/actions.ts — rejectDeployment.
 *
 * Mock strategy mirrors src/app/admin/proofs/__tests__/actions.test.ts:
 * • requireAdmin               — vi.mock'd, controlled per test
 * • prisma.vaultDeployment.*   — vi.mock'd (findUnique + update)
 * • prisma.vaultDeploymentApproval.deleteMany — vi.mock'd
 * • prisma.$transaction        — runs the ops sequentially (Prisma's array form)
 * • recordAdminAudit / logger  — silenced
 *
 * Coverage focus (P0-B / P0-C / P1):
 *   1. Whitelist guard         — non-whitelisted actor → throws.
 *   2. Approvals purge         — successful reject runs deleteMany inside $transaction.
 *   3. Race UX message         — vault already advanced (e.g. "deployed") → clear message.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (must be declared before the module under test is imported) ──────

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDeployment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vaultDeploymentApproval: {
      deleteMany: vi.fn(),
    },
    // $transaction([op1, op2]) — execute Promises in order (matches Prisma's array form)
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

vi.mock("@/lib/admin/audit", () => ({
  recordAdminAudit: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────────────

import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { rejectDeployment } from "../actions";

// ── Helpers ────────────────────────────────────────────────────────────────

const SIGNER_A = "0xSignerA";
const SIGNER_B = "0xSignerB";
const NON_SIGNER = "0xRogueAdmin";

const VAULT_ID = "vault_cuid_001";

function buildVault(overrides: Partial<{ status: string; signersWhitelist: string[] }> = {}) {
  return {
    id: VAULT_ID,
    status: overrides.status ?? "review",
    signersWhitelist: JSON.stringify(
      overrides.signersWhitelist ?? [SIGNER_A, SIGNER_B],
    ),
    // Other columns are not read by rejectDeployment; opaque to the test.
  } as never;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("rejectDeployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("P0-C — non-whitelisted actor → throws 'Only whitelisted signers'", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: "user_rogue",
      walletAddress: NON_SIGNER,
    });
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(buildVault());

    await expect(
      rejectDeployment(VAULT_ID, "I want it back to draft"),
    ).rejects.toThrow("Only whitelisted signers can hard-reject a deployment");

    // No write should have happened: neither the purge nor the status update.
    expect(prisma.vaultDeploymentApproval.deleteMany).not.toHaveBeenCalled();
    expect(prisma.vaultDeployment.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("P0-B — whitelisted actor on review vault → purges approvals in transaction and resets submittedAt", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: "user_a",
      walletAddress: SIGNER_A,
    });
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(buildVault());
    vi.mocked(prisma.vaultDeploymentApproval.deleteMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(prisma.vaultDeployment.update).mockResolvedValue({
      id: VAULT_ID,
      status: "draft",
    } as never);

    await rejectDeployment(VAULT_ID, "Need to revise allocation policy");

    // $transaction was called exactly once, with an array of two operations.
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const txArg = vi.mocked(prisma.$transaction).mock.calls[0]?.[0] as unknown;
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg as unknown[]).toHaveLength(2);

    // Both operations were issued (and were inside the $transaction call).
    expect(prisma.vaultDeploymentApproval.deleteMany).toHaveBeenCalledWith({
      where: { deploymentId: VAULT_ID },
    });
    expect(prisma.vaultDeployment.update).toHaveBeenCalledWith({
      where: { id: VAULT_ID },
      data: { status: "draft", submittedAt: null },
    });

    // Simulate the call chain the bug fix protects against: after reject,
    // a fresh approvals query (deleteMany already ran) must return [].
    vi.mocked(prisma.vaultDeploymentApproval.deleteMany).mockClear();
    // (Real findMany is not mocked here — but the contract proven above is that
    // deleteMany was scoped to deploymentId === VAULT_ID, so the next round
    // starts at zero approvals.)
  });

  it("P1 — race condition: vault.status === 'deployed' → clear UX message", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: "user_a",
      walletAddress: SIGNER_A,
    });
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(
      buildVault({ status: "deployed" }),
    );

    await expect(
      rejectDeployment(VAULT_ID, "Changed my mind"),
    ).rejects.toThrow(/status is now "deployed"/);

    // Race-guard fires before any write — no purge, no update, no transaction.
    expect(prisma.vaultDeploymentApproval.deleteMany).not.toHaveBeenCalled();
    expect(prisma.vaultDeployment.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("Sanity — vault not found → throws 'Not found'", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      userId: "user_a",
      walletAddress: SIGNER_A,
    });
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(null);

    await expect(rejectDeployment(VAULT_ID, "reason")).rejects.toThrow(
      "Not found",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("Sanity — non-admin → requireAdmin throws, propagated", async () => {
    vi.mocked(requireAdmin).mockRejectedValue(new Error("Admin access required."));

    await expect(rejectDeployment(VAULT_ID, "reason")).rejects.toThrow(
      "Admin access required.",
    );
    expect(prisma.vaultDeployment.findUnique).not.toHaveBeenCalled();
  });
});
