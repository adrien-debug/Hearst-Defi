/**
 * Tests for notification server actions.
 *
 * All external dependencies (prisma, requireAdmin, logger, next/cache) are
 * mocked so this test file runs in the vitest `node` environment without a
 * real DB or session.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mocks before any module import ──────────────────────────────────

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/require-admin", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ userId: "user_test123" }),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { markAsRead, markAllAsRead, archive, snooze } from "../actions";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ userId: "user_test123" });
  vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });
});

const UPDATE_MANY = () => vi.mocked(prisma.notification.updateMany);

// A well-formed cuid (25 chars, 'c' prefix — passes z.string().cuid())
const VALID_ID = "clv8wqyim000008jpgr397209";

// ---------------------------------------------------------------------------

describe("markAsRead", () => {
  it("calls updateMany with the correct filter and sets readAt", async () => {
    await markAsRead(VALID_ID);
    expect(UPDATE_MANY()).toHaveBeenCalledOnce();
    expect(UPDATE_MANY()).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: VALID_ID, userId: "user_test123" }),
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      }),
    );
  });

  it("throws on invalid notifId", async () => {
    await expect(markAsRead("not-a-cuid!!")).rejects.toThrow();
  });
});

describe("markAllAsRead", () => {
  it("calls updateMany scoped to the authenticated user", async () => {
    await markAllAsRead();
    expect(UPDATE_MANY()).toHaveBeenCalledOnce();
    expect(UPDATE_MANY()).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user_test123",
          readAt: null,
          archivedAt: null,
        }),
      }),
    );
  });
});

describe("archive", () => {
  it("sets archivedAt for the targeted notification", async () => {
    await archive(VALID_ID);
    expect(UPDATE_MANY()).toHaveBeenCalledOnce();
    expect(UPDATE_MANY()).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: VALID_ID, userId: "user_test123" }),
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
  });

  it("throws on invalid notifId", async () => {
    await expect(archive("bad-id")).rejects.toThrow();
  });
});

describe("snooze", () => {
  it("sets snoozedUntil for the targeted notification", async () => {
    const until = new Date(Date.now() + 3_600_000);
    await snooze(VALID_ID, until);
    expect(UPDATE_MANY()).toHaveBeenCalledOnce();
    expect(UPDATE_MANY()).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: VALID_ID, userId: "user_test123" }),
        data: expect.objectContaining({ snoozedUntil: until }),
      }),
    );
  });

  it("throws on invalid notifId", async () => {
    await expect(snooze("bad-id", new Date())).rejects.toThrow();
  });
});
