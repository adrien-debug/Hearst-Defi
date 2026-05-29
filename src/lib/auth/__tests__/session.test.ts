/**
 * Tests for src/lib/auth/session.ts (database-backed sessions).
 *
 * Strategy: mock `next/headers` (cookies) and `@/lib/db` (prisma) so the tests
 * run in a pure Node/Vitest environment without a real DB. The session token is
 * the opaque `Session.id` carried in the `hc_session` cookie.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before the module under test is imported
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    },
    investor: {
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  getSession,
  getInvestor,
  requireSession,
  SESSION_COOKIE,
} from "../session";

const mockCookies = vi.mocked(cookies);
const mockSessionFind = vi.mocked(prisma.session.findUnique);
const mockSessionDelete = vi.mocked(prisma.session.delete);
const mockInvestorFind = vi.mocked(prisma.investor.findUnique);

/** Minimal cookie store carrying (or not) the hc_session token. */
function makeCookieStore(token?: string) {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE && token ? { value: token } : undefined,
    delete: vi.fn(),
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

/** Build a session row joined with user (+ optional investor). */
function sessionRow(opts: {
  id?: string;
  userId?: string;
  email?: string;
  role?: string;
  walletAddress?: string | null;
  expiresAt?: Date;
}) {
  const userId = opts.userId ?? "user_1";
  return {
    id: opts.id ?? "sess_1",
    userId,
    expiresAt: opts.expiresAt ?? new Date(Date.now() + 60_000),
    createdAt: new Date(),
    user: {
      id: userId,
      email: opts.email ?? "investor@example.com",
      passwordHash: "$argon2id$irrelevant",
      role: opts.role ?? "investor",
      createdAt: new Date(),
      updatedAt: new Date(),
      investor:
        opts.walletAddress === undefined
          ? null
          : {
              id: "inv_1",
              userId,
              walletAddress: opts.walletAddress,
              email: null,
              kycStatus: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSession — Case A: cookie absent → null
// ---------------------------------------------------------------------------

describe("getSession — Case A: cookie absent", () => {
  it("returns null when the hc_session cookie is not set", async () => {
    mockCookies.mockResolvedValue(makeCookieStore());

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockSessionFind).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSession — Case B: unknown token → null
// ---------------------------------------------------------------------------

describe("getSession — Case B: unknown token", () => {
  it("returns null when the session row does not exist", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("ghost-token"));
    mockSessionFind.mockResolvedValue(null);

    const result = await getSession();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getSession — Case C: expired session → delete + null
// ---------------------------------------------------------------------------

describe("getSession — Case C: expired session", () => {
  it("deletes the stale row and returns null", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("sess_expired"));
    mockSessionFind.mockResolvedValue(
      sessionRow({ id: "sess_expired", expiresAt: new Date(Date.now() - 1) }),
    );
    mockSessionDelete.mockResolvedValue(
      sessionRow({ id: "sess_expired" }) as never,
    );

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockSessionDelete).toHaveBeenCalledWith({
      where: { id: "sess_expired" },
    });
  });
});

// ---------------------------------------------------------------------------
// getSession — Case D: valid session → SessionUser
// ---------------------------------------------------------------------------

describe("getSession — Case D: valid session", () => {
  it("returns the SessionUser with role + wallet from the joined user", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("sess_ok"));
    mockSessionFind.mockResolvedValue(
      sessionRow({
        id: "sess_ok",
        userId: "user_42",
        email: "admin@hearst.connect",
        role: "admin",
        walletAddress: "0xabc",
      }),
    );

    const result = await getSession();
    expect(result).toEqual({
      userId: "user_42",
      email: "admin@hearst.connect",
      role: "admin",
      walletAddress: "0xabc",
    });
    expect(mockSessionDelete).not.toHaveBeenCalled();
  });

  it("maps an unknown role to 'investor' and a missing investor to null wallet", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("sess_ok"));
    mockSessionFind.mockResolvedValue(
      sessionRow({ role: "something-else" }), // no investor relation
    );

    const result = await getSession();
    expect(result?.role).toBe("investor");
    expect(result?.walletAddress).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getInvestor — resolves the Investor row for the session user
// ---------------------------------------------------------------------------

describe("getInvestor", () => {
  it("returns null when there is no session", async () => {
    mockCookies.mockResolvedValue(makeCookieStore());

    const result = await getInvestor();
    expect(result).toBeNull();
    expect(mockInvestorFind).not.toHaveBeenCalled();
  });

  it("looks up the Investor by the session userId", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("sess_ok"));
    mockSessionFind.mockResolvedValue(sessionRow({ userId: "user_77" }));

    const investor = {
      id: "inv_77",
      userId: "user_77",
      walletAddress: null,
      email: null,
      kycStatus: "pending",
      accreditationAttestedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockInvestorFind.mockResolvedValue(investor);

    const result = await getInvestor();
    expect(mockInvestorFind).toHaveBeenCalledWith({
      where: { userId: "user_77" },
    });
    expect(result).toEqual(investor);
  });
});

// ---------------------------------------------------------------------------
// requireSession — throws when unauthenticated
// ---------------------------------------------------------------------------

describe("requireSession", () => {
  it("throws when no session is found", async () => {
    mockCookies.mockResolvedValue(makeCookieStore());
    await expect(requireSession()).rejects.toThrow("Authentication required");
  });

  it("returns the session when the token is valid", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("sess_ok"));
    mockSessionFind.mockResolvedValue(sessionRow({ userId: "user_9" }));

    const session = await requireSession();
    expect(session.userId).toBe("user_9");
  });
});
