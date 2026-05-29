/**
 * C-08: Unit tests for attestAccreditation server action.
 *
 * Verifies:
 *  1. Authenticated investor → accreditationAttestedAt written (non-null).
 *  2. Unauthenticated → { ok: false, error } without DB write.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks before module imports ─────────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getInvestor: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    investor: {
      update: vi.fn(),
    },
  },
}));

// ── Import modules AFTER mocks ─────────────────────────────────────────────

import { attestAccreditation } from "@/app/actions/accreditation";
import { getInvestor } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

// ── Typed mock helpers ─────────────────────────────────────────────────────

const mockGetInvestor = vi.mocked(getInvestor);
const mockUpdate = vi.mocked(prisma.investor.update);

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

// ── Tests ──────────────────────────────────────────────────────────────────

describe("attestAccreditation — C-08", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticated investor → writes accreditationAttestedAt and returns ok:true", async () => {
    mockGetInvestor.mockResolvedValue(MOCK_INVESTOR);
    mockUpdate.mockResolvedValue({
      ...MOCK_INVESTOR,
      accreditationAttestedAt: new Date("2026-05-29T10:00:00Z"),
    });

    const result = await attestAccreditation();

    expect(result.ok).toBe(true);

    // Verify the DB write used the correct where clause and set a Date value.
    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MOCK_INVESTOR.id },
        data: expect.objectContaining({
          accreditationAttestedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("accreditationAttestedAt written is a real Date (not null)", async () => {
    mockGetInvestor.mockResolvedValue(MOCK_INVESTOR);
    mockUpdate.mockResolvedValue({
      ...MOCK_INVESTOR,
      accreditationAttestedAt: new Date("2026-05-29T10:00:00Z"),
    });

    await attestAccreditation();

    // Inspect the captured call args to verify the date written is a real Date.
    const callArgs = mockUpdate.mock.calls[0]?.[0];
    const data = callArgs?.data as { accreditationAttestedAt?: Date } | undefined;
    expect(data?.accreditationAttestedAt).toBeInstanceOf(Date);
    expect(data?.accreditationAttestedAt?.getTime()).toBeGreaterThan(0);
  });

  it("unauthenticated → { ok:false, error } without DB write", async () => {
    mockGetInvestor.mockResolvedValue(null);

    const result = await attestAccreditation();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);
    }

    // No DB write should happen when not authenticated.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("is idempotent — calling twice writes twice (re-attestation allowed)", async () => {
    mockGetInvestor.mockResolvedValue(MOCK_INVESTOR);
    mockUpdate.mockResolvedValue({
      ...MOCK_INVESTOR,
      accreditationAttestedAt: new Date(),
    });

    const r1 = await attestAccreditation();
    const r2 = await attestAccreditation();

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });
});
