/**
 * Tests for src/lib/auth/session.ts
 *
 * Strategy: mock `next/headers` (cookies), `jose` (jwtVerify), and
 * `@/lib/db` (prisma) so the tests run in a pure Node/Vitest environment
 * without a real DB or Privy endpoint.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before the module under test is imported
// ---------------------------------------------------------------------------

// Mock next/headers so `cookies()` returns a controllable store.
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock jose — we control what jwtVerify resolves or rejects.
vi.mock("jose", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("jose")>();
  return {
    ...original,
    jwtVerify: vi.fn(),
    // createRemoteJWKSet must return a stable function reference so the lazy
    // JWKS singleton in session.ts can be initialised without network calls.
    createRemoteJWKSet: vi.fn(() => vi.fn()),
  };
});

// Mock Prisma so no real DB is touched.
vi.mock("@/lib/db", () => ({
  prisma: {
    investor: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks are registered)
// ---------------------------------------------------------------------------

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/db";
import { getSession, getInvestor, requireSession } from "../session";

// Typed helpers for the mocks.
const mockCookies = vi.mocked(cookies);
const mockJwtVerify = vi.mocked(jwtVerify);
const mockFindUnique = vi.mocked(prisma.investor.findUnique);
const mockCreate = vi.mocked(prisma.investor.create);

// Minimal cookie store factory.
function makeCookieStore(token?: string) {
  return {
    get: (name: string) =>
      name === "privy-token" && token ? { value: token } : undefined,
  } as Awaited<ReturnType<typeof cookies>>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Provide a minimal app ID so the env guard passes.
  process.env.NEXT_PUBLIC_PRIVY_APP_ID = "test-app-id";
});

// ---------------------------------------------------------------------------
// Case A — cookie absent → null
// ---------------------------------------------------------------------------

describe("getSession — Case A: cookie absent", () => {
  it("returns null when the privy-token cookie is not set", async () => {
    mockCookies.mockResolvedValue(makeCookieStore());

    const result = await getSession();
    expect(result).toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Case B — token invalid → null
// ---------------------------------------------------------------------------

describe("getSession — Case B: invalid token", () => {
  it("returns null when jwtVerify throws (bad signature / expired)", async () => {
    mockCookies.mockResolvedValue(makeCookieStore("bad.token.here"));
    mockJwtVerify.mockRejectedValue(new Error("JWSInvalid"));

    const result = await getSession();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Case C — valid token, investor already exists → return investor
// ---------------------------------------------------------------------------

describe("getInvestor — Case C: existing investor", () => {
  it("returns the existing Investor row without creating a new one", async () => {
    const fakeDid = "did:privy:existing-user";
    const fakeWallet = "0xabc123";

    mockCookies.mockResolvedValue(makeCookieStore("valid.jwt.token"));
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: fakeDid,
        walletAddress: fakeWallet,
        iss: "privy.io",
        aud: "test-app-id",
      },
      protectedHeader: { alg: "ES256" },
      key: {} as CryptoKey,
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const existingInvestor = {
      id: "inv_001",
      userId: fakeDid,
      walletAddress: fakeWallet.toLowerCase(),
      email: null,
      kycStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFindUnique.mockResolvedValue(existingInvestor);

    const result = await getInvestor();

    expect(result).toEqual(existingInvestor);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: fakeDid },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Case D — valid token + walletAddress, investor absent → create + return
// ---------------------------------------------------------------------------

describe("getInvestor — Case D: first-visit upsert", () => {
  it("creates an Investor row when the user authenticates for the first time", async () => {
    const fakeDid = "did:privy:new-user";
    const fakeWallet = "0xDEAD";

    mockCookies.mockResolvedValue(makeCookieStore("valid.jwt.token"));
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: fakeDid,
        wallet_address: fakeWallet,
        iss: "privy.io",
        aud: "test-app-id",
      },
      protectedHeader: { alg: "ES256" },
      key: {} as CryptoKey,
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    // No existing row.
    mockFindUnique.mockResolvedValue(null);

    const createdInvestor = {
      id: "inv_002",
      userId: fakeDid,
      walletAddress: fakeWallet.toLowerCase(),
      email: null,
      kycStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCreate.mockResolvedValue(createdInvestor);

    const result = await getInvestor();

    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: fakeDid,
        walletAddress: fakeWallet.toLowerCase(),
      },
    });
    expect(result).toEqual(createdInvestor);
  });

  it("returns null when walletAddress is absent and no investor row exists", async () => {
    const fakeDid = "did:privy:no-wallet";

    mockCookies.mockResolvedValue(makeCookieStore("valid.jwt.token"));
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: fakeDid,
        iss: "privy.io",
        aud: "test-app-id",
        // No wallet claim — user connected via email only.
      },
      protectedHeader: { alg: "ES256" },
      key: {} as CryptoKey,
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    mockFindUnique.mockResolvedValue(null);

    const result = await getInvestor();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toBeNull();
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

  it("returns the session when token is valid", async () => {
    const fakeDid = "did:privy:valid-user";

    mockCookies.mockResolvedValue(makeCookieStore("valid.jwt.token"));
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: fakeDid,
        iss: "privy.io",
        aud: "test-app-id",
      },
      protectedHeader: { alg: "ES256" },
      key: {} as CryptoKey,
    } as unknown as Awaited<ReturnType<typeof jwtVerify>>);

    const session = await requireSession();
    expect(session.userId).toBe(fakeDid);
  });
});
