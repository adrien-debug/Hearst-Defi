/**
 * Role-guard tests for require-auth.ts / require-admin.ts / require-investor.ts.
 *
 * The three guards all funnel through getSession(). We mock `next/headers`
 * (cookies) and `@/lib/db` (prisma) like session.test.ts, plus:
 *   - `@/lib/request-context` (enterRequestContext is a side-effect on success)
 *   - `next/navigation` (requireInvestor uses redirect(), which throws in prod)
 *
 * requireInvestor's documented contract (read from the source): admin ⊇
 * investor — an admin is allowed through the investor surface; only an
 * absent/invalid session redirects. We test that REAL behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
  },
}));

vi.mock("@/lib/request-context", () => ({
  enterRequestContext: vi.fn(),
}));

// redirect() throws a NEXT_REDIRECT-style signal in real Next; we mimic that so
// the guard's control flow (it must NOT return a session on the no-auth path)
// is observable as a throw.
const redirectError = (url: string) =>
  Object.assign(new Error(`NEXT_REDIRECT:${url}`), { url });
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw redirectError(url);
  }),
}));

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { enterRequestContext } from "@/lib/request-context";
import { redirect } from "next/navigation";
import { requireAuth } from "../require-auth";
import { requireAdmin } from "../require-admin";
import { requireInvestor } from "../require-investor";
import { SESSION_COOKIE } from "../session";

const mockCookies = vi.mocked(cookies);
const mockSessionFind = vi.mocked(prisma.session.findUnique);
const mockEnter = vi.mocked(enterRequestContext);
const mockRedirect = vi.mocked(redirect);

function makeCookieStore(token?: string) {
  return {
    get: (name: string) =>
      name === SESSION_COOKIE && token ? { value: token } : undefined,
    delete: vi.fn(),
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

function sessionRow(role: string, userId = "user_1") {
  return {
    id: "sess_1",
    userId,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    user: {
      id: userId,
      email: `${role}@hearst.connect`,
      passwordHash: "$argon2id$x",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      investor: null,
    },
  };
}

/** Configure cookies + prisma for a given role, or anonymous when role is null. */
function as(role: "admin" | "investor" | null) {
  if (role === null) {
    mockCookies.mockResolvedValue(makeCookieStore());
    return;
  }
  mockCookies.mockResolvedValue(makeCookieStore("sess_1"));
  mockSessionFind.mockResolvedValue(sessionRow(role) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// requireAdmin
// ---------------------------------------------------------------------------

describe("requireAdmin", () => {
  it("passes for an admin session and enters the request context", async () => {
    as("admin");
    const result = await requireAdmin();
    expect(result.userId).toBe("user_1");
    expect(mockEnter).toHaveBeenCalledTimes(1);
  });

  it("rejects an investor with 'Admin access required.'", async () => {
    as("investor");
    await expect(requireAdmin()).rejects.toThrow("Admin access required.");
    expect(mockEnter).not.toHaveBeenCalled();
  });

  it("rejects an anonymous request with an authentication error", async () => {
    as(null);
    await expect(requireAdmin()).rejects.toThrow(/Authentication required/);
  });
});

// ---------------------------------------------------------------------------
// requireInvestor — admin ⊇ investor (allowed through), anon → redirect
// ---------------------------------------------------------------------------

describe("requireInvestor", () => {
  it("passes for an investor session", async () => {
    as("investor");
    const session = await requireInvestor("/dashboard");
    expect(session.role).toBe("investor");
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockEnter).toHaveBeenCalledTimes(1);
  });

  it("ALSO passes for an admin session (admin ⊇ investor)", async () => {
    as("admin");
    const session = await requireInvestor("/dashboard");
    expect(session.role).toBe("admin");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /login?from=<path> for an anonymous request", async () => {
    as(null);
    await expect(requireInvestor("/dashboard")).rejects.toThrow(
      "NEXT_REDIRECT:/login?from=%2Fdashboard",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/login?from=%2Fdashboard");
    expect(mockEnter).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// requireAuth — any valid session passes, none throws
// ---------------------------------------------------------------------------

describe("requireAuth", () => {
  it("returns the userId for any authenticated user", async () => {
    as("investor");
    const result = await requireAuth();
    expect(result.userId).toBe("user_1");
    expect(mockEnter).toHaveBeenCalledTimes(1);
  });

  it("passes for an admin too (role-agnostic)", async () => {
    as("admin");
    await expect(requireAuth()).resolves.toMatchObject({ userId: "user_1" });
  });

  it("throws when there is no session", async () => {
    as(null);
    await expect(requireAuth()).rejects.toThrow(/Authentication required/);
    expect(mockEnter).not.toHaveBeenCalled();
  });
});
