/**
 * Unit tests for the redeem (withdraw) server action.
 *
 * Verifies the guards and the position-update branch (full exit vs partial),
 * mirroring the deposit/subscribe contract.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth/session", () => ({ getInvestor: vi.fn() }));

const findUnique = vi.fn();
const txn = vi.fn();
vi.mock("@/lib/db", () => ({
  prisma: {
    position: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      update: vi.fn(() => ({ __op: "update" })),
    },
    investorTransaction: { create: vi.fn(() => ({ __op: "create" })) },
    $transaction: (...a: unknown[]) => txn(...a),
  },
}));

import { redeem } from "@/app/actions/redeem";
import { getInvestor } from "@/lib/auth/session";

const mockGetInvestor = vi.mocked(getInvestor);
const INVESTOR = {
  id: "inv_1",
  userId: "user_1",
  walletAddress: null,
  email: "lp@firm.io",
  kycStatus: "approved",
  accreditationAttestedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function pos(over: Partial<{ status: string; principal: number; investorId: string }>) {
  return {
    id: "pos_1",
    investorId: over.investorId ?? "inv_1",
    status: over.status ?? "active",
    principalUsdc: { toNumber: () => over.principal ?? 250_000 },
  };
}

describe("redeem server action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    txn.mockResolvedValue([{}, {}]);
  });

  it("unauthenticated → throws", async () => {
    mockGetInvestor.mockResolvedValue(null);
    await expect(redeem("pos_1", 1000)).rejects.toThrow();
  });

  it("rejects an invalid amount without touching the DB", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    const r = await redeem("pos_1", 0);
    expect(r.ok).toBe(false);
    expect(txn).not.toHaveBeenCalled();
  });

  it("rejects a position the investor does not own", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    findUnique.mockResolvedValue(pos({ investorId: "someone_else" }));
    const r = await redeem("pos_1", 1000);
    expect(r).toEqual({ ok: false, error: "Position not found." });
    expect(txn).not.toHaveBeenCalled();
  });

  it("rejects a non-active position", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    findUnique.mockResolvedValue(pos({ status: "exited" }));
    const r = await redeem("pos_1", 1000);
    expect(r.ok).toBe(false);
    expect(txn).not.toHaveBeenCalled();
  });

  it("rejects an amount above the principal", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    findUnique.mockResolvedValue(pos({ principal: 250_000 }));
    const r = await redeem("pos_1", 300_000);
    expect(r.ok).toBe(false);
    expect(txn).not.toHaveBeenCalled();
  });

  it("full redemption closes the position (exited)", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    findUnique.mockResolvedValue(pos({ principal: 250_000 }));
    const r = await redeem("pos_1", 250_000, "0xabc");
    expect(r).toEqual({ ok: true, positionId: "pos_1", closed: true });
    expect(txn).toHaveBeenCalledOnce();
  });

  it("partial redemption keeps the position active", async () => {
    mockGetInvestor.mockResolvedValue(INVESTOR);
    findUnique.mockResolvedValue(pos({ principal: 250_000 }));
    const r = await redeem("pos_1", 100_000, "0xdef");
    expect(r).toEqual({ ok: true, positionId: "pos_1", closed: false });
    expect(txn).toHaveBeenCalledOnce();
  });
});
