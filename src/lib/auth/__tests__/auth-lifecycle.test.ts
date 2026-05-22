/**
 * Login / logout lifecycle + concurrent-session isolation tests for
 * src/lib/auth/session.ts (database-backed sessions).
 *
 * Strategy mirrors session.test.ts: mock `next/headers` (cookies) and
 * `@/lib/db` (prisma). Here we go further than the read-only cases — we model a
 * tiny in-memory Session table so createSession / getSession / destroySession
 * can be exercised as a real lifecycle, looped 10× to prove no state leaks
 * between cycles, and with two concurrent tokens to prove tokens never cross.
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
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    investor: {
      findUnique: vi.fn(),
    },
  },
}));

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  createSession,
  getSession,
  destroySession,
  SESSION_COOKIE,
} from "../session";

const mockCookies = vi.mocked(cookies);
const mockSessionCreate = vi.mocked(prisma.session.create);
const mockSessionFind = vi.mocked(prisma.session.findUnique);
const mockSessionDelete = vi.mocked(prisma.session.delete);

// ---------------------------------------------------------------------------
// In-memory Session table + cookie jar
//
// We wire the prisma mocks to a Map so the four lifecycle operations behave
// like a real (single-process) DB. `users` lets findUnique resolve the joined
// user the same shape session.ts expects.
// ---------------------------------------------------------------------------

interface Row {
  id: string;
  userId: string;
  expiresAt: Date;
}

const userMeta: Record<string, { email: string; role: string }> = {
  user_alice: { email: "alice@hearst.connect", role: "investor" },
  user_bob: { email: "bob@hearst.connect", role: "investor" },
};

let table: Map<string, Row>;
let seq: number;

function joinUser(row: Row) {
  const meta = userMeta[row.userId] ?? { email: "x@x", role: "investor" };
  return {
    ...row,
    createdAt: new Date(),
    user: {
      id: row.userId,
      email: meta.email,
      passwordHash: "$argon2id$irrelevant",
      role: meta.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      investor: null,
    },
  };
}

/** A cookie jar whose get/set/delete are backed by a plain object. */
function makeJar(initial?: Record<string, string>) {
  const store: Record<string, string> = { ...initial };
  return {
    jar: store,
    cookies: {
      get: (name: string) =>
        store[name] !== undefined ? { value: store[name] } : undefined,
      set: (name: string, value: string) => {
        store[name] = value;
      },
      delete: (name: string) => {
        delete store[name];
      },
    } as unknown as Awaited<ReturnType<typeof cookies>>,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  table = new Map();
  seq = 0;

  mockSessionCreate.mockImplementation((async (args: {
    data: { userId: string; expiresAt: Date };
  }) => {
    const id = `sess_${++seq}`;
    const row: Row = {
      id,
      userId: args.data.userId,
      expiresAt: args.data.expiresAt,
    };
    table.set(id, row);
    return { id: row.id, expiresAt: row.expiresAt };
  }) as never);

  mockSessionFind.mockImplementation((async (args: {
    where: { id: string };
  }) => {
    const row = table.get(args.where.id);
    return row ? joinUser(row) : null;
  }) as never);

  mockSessionDelete.mockImplementation((async (args: {
    where: { id: string };
  }) => {
    const row = table.get(args.where.id);
    table.delete(args.where.id);
    return (row ? joinUser(row) : {}) as never;
  }) as never);
});

// ---------------------------------------------------------------------------
// createSession → getSession → destroySession (one clean cycle)
// ---------------------------------------------------------------------------

describe("session lifecycle — single cycle", () => {
  it("createSession persists a row with a future expiry", async () => {
    const before = Date.now();
    const { token, expiresAt } = await createSession("user_alice");

    expect(token).toBe("sess_1");
    expect(expiresAt.getTime()).toBeGreaterThan(before);
    expect(table.get("sess_1")?.userId).toBe("user_alice");
  });

  it("getSession resolves the row created by createSession", async () => {
    const { token } = await createSession("user_alice");
    const { cookies: jar } = makeJar({ [SESSION_COOKIE]: token });
    mockCookies.mockResolvedValue(jar);

    const session = await getSession();
    expect(session).toEqual({
      userId: "user_alice",
      email: "alice@hearst.connect",
      role: "investor",
      walletAddress: null,
    });
  });

  it("destroySession deletes the row and clears the cookie; getSession then → null", async () => {
    const { token } = await createSession("user_alice");
    const { jar, cookies: cookieStore } = makeJar({ [SESSION_COOKIE]: token });
    mockCookies.mockResolvedValue(cookieStore);

    await destroySession();

    // Row gone, cookie cleared.
    expect(table.has(token)).toBe(false);
    expect(jar[SESSION_COOKIE]).toBeUndefined();

    // Subsequent getSession with the now-empty jar must be null.
    const after = await getSession();
    expect(after).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// REPETITION — login→logout 10× with no ghost rows / state leak between cycles
// ---------------------------------------------------------------------------

describe("session lifecycle — 10 repeated login/logout cycles", () => {
  it("leaves zero sessions and an empty cookie jar after every cycle", async () => {
    for (let i = 1; i <= 10; i++) {
      const { jar, cookies: cookieStore } = makeJar();
      mockCookies.mockResolvedValue(cookieStore);

      // Login: create session + write cookie (simulating setSessionCookie).
      const { token } = await createSession("user_alice");
      jar[SESSION_COOKIE] = token;

      // A logged-in read returns the right user.
      const session = await getSession();
      expect(session?.userId, `cycle ${i}: logged-in read`).toBe("user_alice");

      // Exactly one live session for this user — no accumulation from prior cycles.
      expect(table.size, `cycle ${i}: exactly one live session`).toBe(1);

      // Logout.
      await destroySession();

      // No ghost row, cookie cleared, and a post-logout read is null.
      expect(table.size, `cycle ${i}: no ghost session after logout`).toBe(0);
      expect(jar[SESSION_COOKIE], `cycle ${i}: cookie cleared`).toBeUndefined();
      const afterLogout = await getSession();
      expect(afterLogout, `cycle ${i}: read after logout`).toBeNull();
    }

    // Final invariant across all 10 cycles.
    expect(table.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CONCURRENT SESSIONS — two users, two tokens, never crossed
// ---------------------------------------------------------------------------

describe("concurrent sessions", () => {
  it("each token resolves to its own user, never the other", async () => {
    const alice = await createSession("user_alice");
    const bob = await createSession("user_bob");
    expect(alice.token).not.toBe(bob.token);
    expect(table.size).toBe(2);

    // Alice's cookie → Alice.
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: alice.token }).cookies);
    expect((await getSession())?.userId).toBe("user_alice");
    expect((await getSession())?.email).toBe("alice@hearst.connect");

    // Bob's cookie → Bob.
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: bob.token }).cookies);
    expect((await getSession())?.userId).toBe("user_bob");
    expect((await getSession())?.email).toBe("bob@hearst.connect");
  });

  it("destroying one user's session does not affect the other", async () => {
    const alice = await createSession("user_alice");
    const bob = await createSession("user_bob");

    // Bob logs out.
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: bob.token }).cookies);
    await destroySession();

    // Bob's token is dead…
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: bob.token }).cookies);
    expect(await getSession()).toBeNull();

    // …Alice is untouched.
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: alice.token }).cookies);
    expect((await getSession())?.userId).toBe("user_alice");
    expect(table.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// EXPIRY — boundary + cleanup of stale rows
// ---------------------------------------------------------------------------

describe("session expiry", () => {
  it("deletes the stale row and returns null when expiry is in the past", async () => {
    const { token } = await createSession("user_alice");
    // Force the row to be expired.
    table.get(token)!.expiresAt = new Date(Date.now() - 1_000);
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: token }).cookies);

    expect(await getSession()).toBeNull();
    expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: token } });
    expect(table.has(token)).toBe(false);
  });

  it("treats expiry exactly at 'now' as expired (<= boundary), deletes + null", async () => {
    const { token } = await createSession("user_alice");
    const now = 1_900_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    table.get(token)!.expiresAt = new Date(now); // exactly the frontier
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: token }).cookies);

    expect(await getSession()).toBeNull();
    expect(mockSessionDelete).toHaveBeenCalledWith({ where: { id: token } });
    vi.restoreAllMocks();
  });

  it("accepts a session expiring 1ms in the future", async () => {
    const { token } = await createSession("user_alice");
    const now = 1_900_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    table.get(token)!.expiresAt = new Date(now + 1);
    mockCookies.mockResolvedValue(makeJar({ [SESSION_COOKIE]: token }).cookies);

    expect((await getSession())?.userId).toBe("user_alice");
    expect(mockSessionDelete).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// FORGED / UNKNOWN TOKEN — null, never throws
// ---------------------------------------------------------------------------

describe("forged / unknown token", () => {
  it("returns null (no throw) for a token that maps to no row", async () => {
    mockCookies.mockResolvedValue(
      makeJar({ [SESSION_COOKIE]: "forged-cuid-deadbeef" }).cookies,
    );
    await expect(getSession()).resolves.toBeNull();
    expect(mockSessionDelete).not.toHaveBeenCalled();
  });

  it("destroySession on an unknown token is a no-op that does not throw", async () => {
    const { cookies: cookieStore } = makeJar({
      [SESSION_COOKIE]: "forged-token",
    });
    mockCookies.mockResolvedValue(cookieStore);
    // delete on a missing row would reject in real prisma; session.ts swallows it.
    mockSessionDelete.mockRejectedValueOnce(new Error("Record not found") as never);
    await expect(destroySession()).resolves.toBeUndefined();
  });
});
