/**
 * C-12 — Password reset flow unit tests.
 *
 * Strategy:
 *  - prisma is mocked via vi.mock so the DB never touches the filesystem.
 *  - Resend HTTP calls are intercepted by mocking globalThis.fetch.
 *  - hashPassword / verifyPassword use real argon2 (fast in test env).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ── Prisma mock ──────────────────────────────────────────────────────────────
// Must be hoisted BEFORE the module under test is imported.
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("server-only", () => ({}));

import { prisma } from "@/lib/db";
import {
  requestPasswordReset,
  validateResetToken,
  consumeResetToken,
  RESET_REQUESTED_MSG,
} from "../password-reset";
import { hashPassword, verifyPassword } from "../password";

// ── Fetch mock ────────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test_key";
  // Default fetch stub — success.
  mockFetch.mockResolvedValue({
    ok: true,
    text: async () => '{"id":"abc"}',
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_USER_ID = "cltest0000";
const FAKE_EMAIL = "investor@hearst.test";

// Build a real (but fast) token hash for use in tests.
function sha256Hex(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// ── Tests: requestPasswordReset ───────────────────────────────────────────────

describe("requestPasswordReset", () => {
  it("always returns the anti-enumeration message regardless of email existence", async () => {
    // @ts-expect-error mocked
    prisma.user.findUnique.mockResolvedValue(null);
    const msg = await requestPasswordReset("nobody@unknown.xyz", "http://localhost:3000");
    expect(msg).toBe(RESET_REQUESTED_MSG);
    // No token should be created for a non-existent user.
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    // Resend should NOT be called for unknown emails.
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("creates a token and sends an email for known users", async () => {
    // @ts-expect-error mocked
    prisma.user.findUnique.mockResolvedValue({ id: FAKE_USER_ID });
    // @ts-expect-error mocked
    prisma.passwordResetToken.create.mockResolvedValue({});

    const msg = await requestPasswordReset(FAKE_EMAIL, "http://localhost:3000");
    expect(msg).toBe(RESET_REQUESTED_MSG);

    // Token persisted.
    expect(prisma.passwordResetToken.create).toHaveBeenCalledOnce();
    const createCall = (prisma.passwordResetToken.create as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(createCall).toBeDefined();
    // The stored tokenHash is not the raw token.
    const { tokenHash } = createCall![0]!.data as { tokenHash: string };
    expect(tokenHash).toHaveLength(64); // sha256 hex

    // Email sent via Resend fetch.
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.method).toBe("POST");
    const bodyParsed = JSON.parse(options.body as string);
    expect(bodyParsed.to).toContain(FAKE_EMAIL);
    // The reset URL in the email contains the raw token (NOT the hash).
    expect(bodyParsed.html).toContain("/reset-password?token=");
  });

  it("returns the same message even when Resend throws (email error swallowed)", async () => {
    // @ts-expect-error mocked
    prisma.user.findUnique.mockResolvedValue({ id: FAKE_USER_ID });
    // @ts-expect-error mocked
    prisma.passwordResetToken.create.mockResolvedValue({});
    mockFetch.mockRejectedValue(new Error("Resend unavailable"));

    const msg = await requestPasswordReset(FAKE_EMAIL, "http://localhost:3000");
    // Anti-enumeration: same message even if email fails.
    expect(msg).toBe(RESET_REQUESTED_MSG);
  });
});

// ── Tests: validateResetToken ─────────────────────────────────────────────────

describe("validateResetToken", () => {
  it("returns not_found for unknown tokens", async () => {
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    const result = await validateResetToken("deadbeef");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("not_found");
  });

  it("returns already_used for consumed tokens", async () => {
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash: sha256Hex("sometoken"),
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: new Date(), // already used
    });
    const result = await validateResetToken("sometoken");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("already_used");
  });

  it("returns expired for tokens past their TTL", async () => {
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash: sha256Hex("expiredtoken"),
      expiresAt: new Date(Date.now() - 1000), // expired
      usedAt: null,
    });
    const result = await validateResetToken("expiredtoken");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("expired");
  });

  it("returns valid for a fresh unused token", async () => {
    const raw = "freshtoken";
    const tokenHash = sha256Hex(raw);
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
    });
    const result = await validateResetToken(raw);
    expect(result.valid).toBe(true);
  });
});

// ── Tests: consumeResetToken ──────────────────────────────────────────────────

describe("consumeResetToken", () => {
  it("rejects usage of an already-used token (single-use guarantee)", async () => {
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash: sha256Hex("usedtoken"),
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: new Date(), // already used
    });

    const result = await consumeResetToken("usedtoken", "newPassword123");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("already_used");
  });

  it("rejects an expired token", async () => {
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash: sha256Hex("expiredtoken"),
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });

    const result = await consumeResetToken("expiredtoken", "newPassword123");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("expired");
  });

  it("rejects a weak password (< 8 chars)", async () => {
    const result = await consumeResetToken("anytoken", "short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("weak_password");
  });

  it("updates the password hash and marks token used on valid consumption", async () => {
    const raw = "validtoken";
    const tokenHash = sha256Hex(raw);
    // @ts-expect-error mocked
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      userId: FAKE_USER_ID,
      tokenHash,
      expiresAt: new Date(Date.now() + 3600_000),
      usedAt: null,
    });
    // $transaction executes the array of operations.
    const updateUserFn = vi.fn().mockResolvedValue({});
    const updateTokenFn = vi.fn().mockResolvedValue({});
    // @ts-expect-error mocked
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => {
      for (const op of ops) await op;
    });
    // @ts-expect-error mocked
    prisma.user = { update: updateUserFn };
    // @ts-expect-error mocked
    prisma.passwordResetToken = {
      findUnique: prisma.passwordResetToken.findUnique,
      update: updateTokenFn,
      create: prisma.passwordResetToken.create,
    };

    const result = await consumeResetToken(raw, "NewSecurePass1!");
    expect(result.ok).toBe(true);

    // Transaction was called.
    expect(prisma.$transaction).toHaveBeenCalledOnce();

    // The new password hash differs from the plaintext.
    const userUpdateCall = updateUserFn.mock.calls[0]!;
    const newHash = userUpdateCall[0]!.data.passwordHash as string;
    expect(newHash).not.toBe("NewSecurePass1!");
    expect(newHash.startsWith("$argon2")).toBe(true);

    // Token marked as used.
    const tokenUpdateCall = updateTokenFn.mock.calls[0]!;
    expect(tokenUpdateCall[0]!.data.usedAt).toBeInstanceOf(Date);
  });

  it("password updated via argon2 — roundtrip verifies correctly", async () => {
    const newPass = "Hearst2026!Secure";
    const hashed = await hashPassword(newPass);
    // Verify the hash works as expected.
    expect(await verifyPassword(hashed, newPass)).toBe(true);
    expect(await verifyPassword(hashed, "wrongpassword")).toBe(false);
  });
});
