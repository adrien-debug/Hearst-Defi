/**
 * Unit tests for src/app/actions/subscribe.ts — Class B wiring (E2).
 *
 * Mock strategy mirrors src/app/admin/vaults/__tests__/actions.test.ts:
 *  • getInvestor      — vi.mock'd, controlled per test
 *  • getVault         — vi.mock'd, returns a live vault fixture
 *  • prisma.*         — vi.mock'd
 *  • next/cache       — vi.mock'd (revalidatePath silenced)
 *
 * Coverage (3 mandatory cases per task E2 acceptance criteria):
 *   1. Subscribe B — valid $2M on live vault → ok: true, positionId present
 *   2. Subscribe B — amount $500k < $1M minimum → ok: false with clear error
 *   3. Subscribe B — non-authenticated → throws (unauthenticated guard)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks (declared before the module under test is imported) ─────────────

vi.mock("@/lib/auth/session", () => ({
  getInvestor: vi.fn(),
}));

vi.mock("@/lib/data/vaults", () => ({
  getVault: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    vaultDeployment: {
      findUnique: vi.fn(),
    },
    position: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────

import { getInvestor } from "@/lib/auth/session";
import { getVault } from "@/lib/data/vaults";
import { prisma } from "@/lib/db";
import { subscribe } from "@/app/actions/subscribe";

// ── Fixtures ──────────────────────────────────────────────────────────────

const MOCK_INVESTOR = {
  id: "inv_cuid_001",
  userId: "user_cuid_001",
  walletAddress: null,
  email: "lp@hedgefund.io",
  kycStatus: "approved",
  accreditationAttestedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** A live vault with enough capacity for a $2M Class B subscription. */
const LIVE_VAULT = {
  id: "hearst-yield-vault",
  ticker: "HYV-A",
  name: "Hearst Yield Vault",
  description: "Mining-backed structured yield.",
  strategy: "mining_yield" as const,
  status: "live" as const,
  apyLow: 8,
  apyHigh: 15,
  minTicketUsdc: 250_000,   // Class A min (vault-level guard, kept as reference)
  softLockupDays: 60,
  capacityUsdc: 100_000_000,
  currentAumUsdc: 10_000_000,
  fees: { mgmtBps: 100, perfBps: 1_000, hurdleBps: 0 },
  riskLevel: "low-moderate" as const,
  spvJurisdiction: "cayman",
  shareClass: "A",
  regExemption: "regS",
  disclaimers: "Projections are not guaranteed.",
  targetMiningBps: 6000,
  targetBtcTacticalBps: 2500,
  targetUsdcBaseBps: 1000,
  targetStableReserveBps: 500,
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe("subscribe — Class B wiring (E2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no matching DB deployment row → vaultKey fallback
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(null);
  });

  // ── Case 1: happy path — $2M Class B on a live vault ───────────────────
  it("Class B — valid $2M subscription on live vault → ok: true with positionId", async () => {
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);
    vi.mocked(prisma.position.create).mockResolvedValue({
      id: "pos_cuid_b_001",
      investorId: MOCK_INVESTOR.id,
      vaultDeploymentId: null,
      vaultKey: "hearst-yield-vault:class-B",
      principalUsdc: 2_000_000 as unknown as import("@prisma/client").Prisma.Decimal,
      accruedYieldUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      distributedUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      status: "active",
      subscribedAt: new Date(),
      maturedAt: null,
      exitedAt: null,
      txHashOpen: null,
    });

    const result = await subscribe("hearst-yield-vault", 2_000_000, "B");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.positionId).toBe("pos_cuid_b_001");
    }

    // Verify the position was created with the class-B key suffix
    expect(prisma.position.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vaultKey: "hearst-yield-vault:class-B",
          principalUsdc: 2_000_000,
        }),
      }),
    );
  });

  // ── Case 2: below Class B minimum ($500k < $1M) → clear error ──────────
  it("Class B — $500k below $1M minimum → ok: false with minimum-ticket error", async () => {
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);

    const result = await subscribe("hearst-yield-vault", 500_000, "B");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/1000k.*class b/i);
    }

    // No position should have been created
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  // ── Case 3: not authenticated → throws ────────────────────────────────
  it("Class B — unauthenticated investor → throws", async () => {
    vi.mocked(getInvestor).mockResolvedValue(null);
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);

    await expect(
      subscribe("hearst-yield-vault", 2_000_000, "B"),
    ).rejects.toThrow("Unauthenticated");

    // No vault fetch, no position write should have happened
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  // ── Bonus: Class A still works after the refactor ──────────────────────
  it("Class A — $250k (minimum) still accepted without classCode arg (backward compat)", async () => {
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);
    vi.mocked(prisma.position.create).mockResolvedValue({
      id: "pos_cuid_a_001",
      investorId: MOCK_INVESTOR.id,
      vaultDeploymentId: null,
      vaultKey: "hearst-yield-vault:class-A",
      principalUsdc: 250_000 as unknown as import("@prisma/client").Prisma.Decimal,
      accruedYieldUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      distributedUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      status: "active",
      subscribedAt: new Date(),
      maturedAt: null,
      exitedAt: null,
      txHashOpen: null,
    });

    // Omit classCode — defaults to "A"
    const result = await subscribe("hearst-yield-vault", 250_000);

    expect(result.ok).toBe(true);
  });

  // ── Bonus: Class A $249k → fails with Class A message ─────────────────
  it("Class A — $249k below $250k minimum → ok: false mentioning Class A", async () => {
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);

    const result = await subscribe("hearst-yield-vault", 249_000, "A");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/250k.*class a/i);
    }
  });
});

// ── C-01: KYC gate tests ───────────────────────────────────────────────────

describe("subscribe — C-01 KYC gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(null);
  });

  it("kycStatus=pending → { ok:false, error: KYC approval required... }", async () => {
    vi.mocked(getInvestor).mockResolvedValue({
      ...MOCK_INVESTOR,
      kycStatus: "pending",
    });
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);

    const result = await subscribe("hearst-yield-vault", 250_000, "A");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("KYC approval required before subscribing.");
    }
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  it("kycStatus=rejected → { ok:false, error: KYC approval required... }", async () => {
    vi.mocked(getInvestor).mockResolvedValue({
      ...MOCK_INVESTOR,
      kycStatus: "rejected",
    });
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);

    const result = await subscribe("hearst-yield-vault", 250_000, "A");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("KYC approval required before subscribing.");
    }
    expect(prisma.position.create).not.toHaveBeenCalled();
  });

  it("kycStatus=approved → position created successfully", async () => {
    vi.mocked(getInvestor).mockResolvedValue({
      ...MOCK_INVESTOR,
      kycStatus: "approved",
    });
    vi.mocked(getVault).mockResolvedValue(LIVE_VAULT);
    vi.mocked(prisma.position.create).mockResolvedValue({
      id: "pos_kyc_ok_001",
      investorId: MOCK_INVESTOR.id,
      vaultDeploymentId: null,
      vaultKey: "hearst-yield-vault:class-A",
      principalUsdc: 250_000 as unknown as import("@prisma/client").Prisma.Decimal,
      accruedYieldUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      distributedUsdc: 0 as unknown as import("@prisma/client").Prisma.Decimal,
      status: "active",
      subscribedAt: new Date(),
      maturedAt: null,
      exitedAt: null,
      txHashOpen: null,
    });

    const result = await subscribe("hearst-yield-vault", 250_000, "A");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.positionId).toBe("pos_kyc_ok_001");
    }
  });
});
