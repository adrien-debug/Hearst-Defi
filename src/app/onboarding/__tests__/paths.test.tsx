/**
 * SSR tests for the LP onboarding paths.
 *
 * These tests verify that:
 *   1. Each path resolves to the correct step definitions.
 *   2. The step IDs match the canonical spec in onboarding-types.ts.
 *   3. No forbidden words appear in step labels or descriptions.
 *
 * We test the pure type/config layer (STEPS_BY_PATH) because:
 *   - The page is a Server Component that reads from params (async).
 *   - Testing the pure config avoids mocking Next.js navigation primitives.
 *   - This is the pattern already established in src/__tests__/proxy.test.ts.
 */

import { describe, it, expect } from "vitest";

import {
  STEPS_BY_PATH,
  ONBOARDING_PATHS,
  parseOnboardingPath,
  PATH_META,
} from "@/lib/onboarding-types";

// Forbidden words — must not appear in any user-facing text per CLAUDE.md rule #5
const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "certain",
  "will deliver",
  "risk-free",
] as const;

function checkForbiddenWords(text: string): string[] {
  return FORBIDDEN_WORDS.filter((word) =>
    text.toLowerCase().includes(word.toLowerCase()),
  );
}

// ── Individual path ────────────────────────────────────────────────────────────

describe("onboarding path: individual", () => {
  const path = "individual" as const;
  const steps = STEPS_BY_PATH[path];

  it("has exactly 3 steps", () => {
    expect(steps).toHaveLength(3);
  });

  it("step IDs match canonical spec", () => {
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual(["kyc", "accreditation", "bank-wire"]);
  });

  it("every step has a non-empty label and description", () => {
    for (const step of steps) {
      expect(step.label.trim().length).toBeGreaterThan(0);
      expect(step.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("no forbidden words in step text", () => {
    for (const step of steps) {
      const hits = [
        ...checkForbiddenWords(step.label),
        ...checkForbiddenWords(step.description),
      ];
      expect(hits, `Forbidden words in individual step "${step.id}": ${hits.join(", ")}`).toHaveLength(0);
    }
  });
});

// ── Corporate path ─────────────────────────────────────────────────────────────

describe("onboarding path: corporate", () => {
  const path = "corporate" as const;
  const steps = STEPS_BY_PATH[path];

  it("has exactly 4 steps", () => {
    expect(steps).toHaveLength(4);
  });

  it("step IDs match canonical spec", () => {
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual(["entity-docs", "ubo", "kyc-officer", "bank-wire"]);
  });

  it("every step has a non-empty label and description", () => {
    for (const step of steps) {
      expect(step.label.trim().length).toBeGreaterThan(0);
      expect(step.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("no forbidden words in step text", () => {
    for (const step of steps) {
      const hits = [
        ...checkForbiddenWords(step.label),
        ...checkForbiddenWords(step.description),
      ];
      expect(hits, `Forbidden words in corporate step "${step.id}": ${hits.join(", ")}`).toHaveLength(0);
    }
  });
});

// ── Fund path ──────────────────────────────────────────────────────────────────

describe("onboarding path: fund", () => {
  const path = "fund" as const;
  const steps = STEPS_BY_PATH[path];

  it("has exactly 4 steps", () => {
    expect(steps).toHaveLength(4);
  });

  it("step IDs match canonical spec", () => {
    const ids = steps.map((s) => s.id);
    expect(ids).toEqual([
      "fund-formation",
      "aml",
      "sub-advisor",
      "master-account",
    ]);
  });

  it("every step has a non-empty label and description", () => {
    for (const step of steps) {
      expect(step.label.trim().length).toBeGreaterThan(0);
      expect(step.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("no forbidden words in step text", () => {
    for (const step of steps) {
      const hits = [
        ...checkForbiddenWords(step.label),
        ...checkForbiddenWords(step.description),
      ];
      expect(hits, `Forbidden words in fund step "${step.id}": ${hits.join(", ")}`).toHaveLength(0);
    }
  });
});

// ── Cross-path invariants ──────────────────────────────────────────────────────

describe("onboarding paths — shared invariants", () => {
  it("ONBOARDING_PATHS contains exactly individual, corporate, fund", () => {
    expect([...ONBOARDING_PATHS].sort()).toEqual(
      ["corporate", "fund", "individual"].sort(),
    );
  });

  it("every path has at least one step", () => {
    for (const path of ONBOARDING_PATHS) {
      expect(STEPS_BY_PATH[path].length).toBeGreaterThan(0);
    }
  });

  it("every path has PATH_META title and subtitle", () => {
    for (const path of ONBOARDING_PATHS) {
      expect(PATH_META[path].title.trim().length).toBeGreaterThan(0);
      expect(PATH_META[path].subtitle.trim().length).toBeGreaterThan(0);
    }
  });

  it("parseOnboardingPath returns null for unknown values", () => {
    expect(parseOnboardingPath("")).toBeNull();
    expect(parseOnboardingPath("unknown")).toBeNull();
    expect(parseOnboardingPath("INDIVIDUAL")).toBeNull();
    expect(parseOnboardingPath("../admin")).toBeNull();
  });

  it("parseOnboardingPath correctly validates all canonical paths", () => {
    expect(parseOnboardingPath("individual")).toBe("individual");
    expect(parseOnboardingPath("corporate")).toBe("corporate");
    expect(parseOnboardingPath("fund")).toBe("fund");
  });

  it("no duplicate step IDs within any path", () => {
    for (const path of ONBOARDING_PATHS) {
      const ids = STEPS_BY_PATH[path].map((s) => s.id);
      const unique = new Set(ids);
      expect(unique.size, `Duplicate step IDs in path "${path}"`).toBe(ids.length);
    }
  });
});
