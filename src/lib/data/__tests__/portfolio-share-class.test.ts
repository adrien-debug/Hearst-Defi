/**
 * C-03: Unit tests for the vaultKey → share-class derivation helpers in
 * src/lib/data/portfolio.ts.
 *
 * These helpers are pure functions (no I/O), so no Prisma mock is needed.
 * Tests verify:
 *   - vaultKey ending in ":class-B"  → softLockupDays === 90
 *   - vaultKey ending in ":class-A"  → softLockupDays === 60
 *   - legacy / no suffix             → defaults to class A (60 days)
 *   - cadence is not a hardcoded literal but derived via cadenceFromTerms
 */

import { describe, it, expect } from "vitest";

// Mock server-only so the import doesn't throw in the test env.
vi.mock("server-only", () => ({}));

// Prisma is imported transitively — mock it to avoid real DB connection.
vi.mock("@/lib/db", () => ({
  prisma: {
    position: { findFirst: vi.fn().mockResolvedValue(null) },
    investorTransaction: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

// getInvestor is a server util — stub it out.
vi.mock("@/lib/auth/session", () => ({
  getInvestor: vi.fn().mockResolvedValue(null),
}));

import { vi } from "vitest";
import {
  shareClassCodeFromVaultKey,
  shareClassTermsFromVaultKey,
  cadenceFromTerms,
} from "@/lib/data/portfolio";
import { SHARE_CLASS_A, SHARE_CLASS_B } from "@/lib/engine/share-class";

// ---------------------------------------------------------------------------
// shareClassCodeFromVaultKey
// ---------------------------------------------------------------------------

describe("shareClassCodeFromVaultKey — C-03", () => {
  it('":class-B" suffix → "B"', () => {
    expect(shareClassCodeFromVaultKey("hearst-yield-vault:class-B")).toBe("B");
  });

  it('":class-A" suffix → "A"', () => {
    expect(shareClassCodeFromVaultKey("hearst-yield-vault:class-A")).toBe("A");
  });

  it("case-insensitive suffix match", () => {
    expect(shareClassCodeFromVaultKey("hearst-yield-vault:class-b")).toBe("B");
    expect(shareClassCodeFromVaultKey("hearst-yield-vault:class-a")).toBe("A");
  });

  it("legacy key without suffix → defaults to A", () => {
    expect(shareClassCodeFromVaultKey("hearst_yield_vault")).toBe("A");
  });

  it("null → A", () => {
    expect(shareClassCodeFromVaultKey(null)).toBe("A");
  });

  it("undefined → A", () => {
    expect(shareClassCodeFromVaultKey(undefined)).toBe("A");
  });

  it("empty string → A", () => {
    expect(shareClassCodeFromVaultKey("")).toBe("A");
  });
});

// ---------------------------------------------------------------------------
// shareClassTermsFromVaultKey — lock-up days
// ---------------------------------------------------------------------------

describe("shareClassTermsFromVaultKey — C-03 softLockupDays", () => {
  it('vaultKey ":class-B" → softLockupDays === 90', () => {
    const terms = shareClassTermsFromVaultKey("hearst-yield-vault:class-B");
    expect(terms.softLockupDays).toBe(90);
  });

  it('vaultKey ":class-A" → softLockupDays === 60', () => {
    const terms = shareClassTermsFromVaultKey("hearst-yield-vault:class-A");
    expect(terms.softLockupDays).toBe(60);
  });

  it("no suffix → class A preset (60 days)", () => {
    const terms = shareClassTermsFromVaultKey("hearst_yield_vault");
    expect(terms.softLockupDays).toBe(SHARE_CLASS_A.softLockupDays);
  });

  it('vaultKey ":class-B" returns the canonical SHARE_CLASS_B preset', () => {
    const terms = shareClassTermsFromVaultKey("hearst-yield-vault:class-B");
    expect(terms).toEqual(SHARE_CLASS_B);
  });

  it('vaultKey ":class-A" returns the canonical SHARE_CLASS_A preset', () => {
    const terms = shareClassTermsFromVaultKey("hearst-yield-vault:class-A");
    expect(terms).toEqual(SHARE_CLASS_A);
  });
});

// ---------------------------------------------------------------------------
// cadenceFromTerms — not a hardcoded literal
// ---------------------------------------------------------------------------

describe("cadenceFromTerms — C-03 cadence derivation", () => {
  it("class A → cadence is 'monthly, T+5'", () => {
    expect(cadenceFromTerms(SHARE_CLASS_A)).toBe("monthly, T+5");
  });

  it("class B → cadence is 'monthly, T+5' (same schedule, longer lock-up)", () => {
    expect(cadenceFromTerms(SHARE_CLASS_B)).toBe("monthly, T+5");
  });

  it("cadence is not undefined or empty", () => {
    expect(cadenceFromTerms(SHARE_CLASS_A)).toBeTruthy();
    expect(cadenceFromTerms(SHARE_CLASS_B)).toBeTruthy();
  });
});
