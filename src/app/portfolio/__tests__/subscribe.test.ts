/**
 * Unit tests for src/app/portfolio/actions.ts — subscribe() Server Action.
 *
 * Three cases:
 *   1. ok: valid vault + active class A + amount ≥ minTicket → { ok: true }
 *   2. amount too low: amount < minTicket → { ok: false, error: <min ticket msg> }
 *   3. non-auth: no session → { ok: false, error: "Sign in to subscribe." }
 *
 * DB is mocked via vi.mock; no real SQLite connection required.
 * next/cache.revalidatePath is stubbed so it does not throw in test mode.
 *
 * Decimal handling: Prisma returns Decimal objects; we simulate that by
 * returning { toNumber: () => n } shaped objects from the mock.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (must be at the top level before any import of the SUT).
// ---------------------------------------------------------------------------

// Stub next/cache so revalidatePath does not throw in vitest/node.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Stub next/headers to avoid "Cannot read properties of undefined" errors that
// arise when `cookies()` is called from session.ts outside a Next.js RSC context.
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// Stub the Prisma client — we control every query result in tests.
vi.mock("@/lib/db", () => ({
  prisma: {
    shareClass: {
      findUnique: vi.fn(),
    },
    vaultDeployment: {
      findUnique: vi.fn(),
    },
    subscription: {
      create: vi.fn(),
    },
  },
}));

// Stub auth — we control session / investor resolution.
vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  getInvestor: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are wired).
// ---------------------------------------------------------------------------

import { subscribe } from "../actions";
import { prisma } from "@/lib/db";
import { getSession, getInvestor } from "@/lib/auth/session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a mock Prisma Decimal-like object. */
function decimal(n: number): { toNumber: () => number } {
  return { toNumber: () => n };
}

const VAULT_ID = "hearst-yield-vault";
const CLASS_CODE = "A";
const SHARE_CLASS_ID = "sc-a-001";

const MOCK_SHARE_CLASS = {
  id: SHARE_CLASS_ID,
  vaultId: VAULT_ID,
  code: CLASS_CODE,
  minTicket: decimal(250_000),
  lockupDays: 60,
  mgmtFeeBps: 100,
  perfFeeBps: 1000,
  active: true,
};

const MOCK_VAULT_LIVE = { id: VAULT_ID, status: "live" };

const MOCK_SESSION = {
  userId: "user-001",
  email: "investor@hearst.connect",
  role: "investor" as const,
  walletAddress: null,
};

const MOCK_INVESTOR = {
  id: "inv-001",
  userId: "user-001",
  walletAddress: null,
  email: null,
  kycStatus: "approved",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_SUBSCRIPTION = {
  id: "sub-001",
  lockupUntil: new Date(Date.now() + 60 * 86_400_000),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("subscribe() Server Action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Case 1: happy path ────────────────────────────────────────────────────

  it("1 — ok: valid vault + active class A + amount ≥ minTicket returns ok:true", async () => {
    vi.mocked(getSession).mockResolvedValue(MOCK_SESSION);
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);

    vi.mocked(prisma.shareClass.findUnique).mockResolvedValue(
      MOCK_SHARE_CLASS as never,
    );
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(
      MOCK_VAULT_LIVE as never,
    );
    vi.mocked(prisma.subscription.create).mockResolvedValue(
      MOCK_SUBSCRIPTION as never,
    );

    const result = await subscribe(VAULT_ID, CLASS_CODE, 300_000);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("narrowing");

    expect(result.subscriptionId).toBe("sub-001");
    expect(result.lockupUntil).toBeInstanceOf(Date);

    // Subscription row was persisted with the correct amount.
    expect(prisma.subscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vaultId: VAULT_ID,
          shareClassId: SHARE_CLASS_ID,
          amount: 300_000,
          status: "pending",
        }),
      }),
    );
  });

  // ── Case 2: amount too low ────────────────────────────────────────────────

  it("2 — amount too low: returns ok:false with minimum ticket error", async () => {
    vi.mocked(getSession).mockResolvedValue(MOCK_SESSION);
    vi.mocked(getInvestor).mockResolvedValue(MOCK_INVESTOR);

    vi.mocked(prisma.shareClass.findUnique).mockResolvedValue(
      MOCK_SHARE_CLASS as never,
    );
    // Vault lookup should not be reached, but stub it defensively.
    vi.mocked(prisma.vaultDeployment.findUnique).mockResolvedValue(
      MOCK_VAULT_LIVE as never,
    );

    // Amount below $250k minimum.
    const result = await subscribe(VAULT_ID, CLASS_CODE, 100_000);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("narrowing");

    expect(result.error).toMatch(/minimum ticket/i);
    expect(result.error).toMatch(/250k/i);

    // Subscription must NOT be created when amount is too low.
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });

  // ── Case 3: non-auth ──────────────────────────────────────────────────────

  it("3 — non-auth: no session returns ok:false with sign-in error", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    // getInvestor should not even be reached.
    vi.mocked(getInvestor).mockResolvedValue(null);

    const result = await subscribe(VAULT_ID, CLASS_CODE, 300_000);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("narrowing");

    expect(result.error).toBe("Sign in to subscribe.");

    // No DB access when not authenticated.
    expect(prisma.shareClass.findUnique).not.toHaveBeenCalled();
    expect(prisma.subscription.create).not.toHaveBeenCalled();
  });
});
