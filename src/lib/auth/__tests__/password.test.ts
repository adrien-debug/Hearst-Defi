/**
 * Roundtrip tests for src/lib/auth/password.ts.
 *
 * These run in the Vitest node environment; `server-only` is aliased to the
 * no-op empty.js in vitest.config.ts so the module can be imported directly.
 *
 * hashPassword is not yet wired to any signup flow at MVP (users are seeded via
 * direct Prisma calls that bypass this module). These tests act as the living
 * contract that the argon2id roundtrip is correct and will remain correct when
 * the V1 KYC signup path is introduced.
 */

import { describe, it, expect } from "vitest";

import { hashPassword, verifyPassword } from "../password";

describe("hashPassword / verifyPassword — argon2id roundtrip", () => {
  it("produces a hash that verifies correctly against the original plaintext", async () => {
    const plain = "correct-horse-battery-staple";
    const hashed = await hashPassword(plain);

    expect(await verifyPassword(hashed, plain)).toBe(true);
  });

  it("rejects a wrong password against the stored hash", async () => {
    const hashed = await hashPassword("secret");

    expect(await verifyPassword(hashed, "wrong")).toBe(false);
  });

  it("produces a different hash on each call (per-hash salt)", async () => {
    const plain = "same-input";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    // Both hashes must verify — but they must differ (distinct salts).
    expect(await verifyPassword(hash1, plain)).toBe(true);
    expect(await verifyPassword(hash2, plain)).toBe(true);
    expect(hash1).not.toBe(hash2);
  });
});
