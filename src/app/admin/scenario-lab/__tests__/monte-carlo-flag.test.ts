/**
 * SSR feature-flag tests for ENABLE_MONTE_CARLO.
 *
 * Strategy: the flag reads process.env at module load time, so we manipulate
 * the env var and re-import the module in each test via vi.resetModules() to
 * get a fresh evaluation. This mirrors exactly what Next.js SSR does on each
 * cold boot.
 *
 * Test 1 — flag ON  → FEATURE_FLAGS.ENABLE_MONTE_CARLO is true  (panel visible)
 * Test 2 — flag OFF → FEATURE_FLAGS.ENABLE_MONTE_CARLO is false (panel absent)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("FEATURE_FLAGS.ENABLE_MONTE_CARLO — SSR evaluation", () => {
  // Save and restore original env value around each test.
  const ORIGINAL = process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO;

  beforeEach(() => {
    // Reset module registry so the next import re-evaluates the module body,
    // picking up the env var change we set for that test.
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original value.
    if (ORIGINAL === undefined) {
      delete process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO;
    } else {
      process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO = ORIGINAL;
    }
    vi.resetModules();
  });

  it("flag ON — panel is visible (ENABLE_MONTE_CARLO = true)", async () => {
    process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO = "true";

    // Dynamic import after env mutation so the module re-evaluates.
    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");

    expect(FEATURE_FLAGS.ENABLE_MONTE_CARLO).toBe(true);
  });

  it("flag OFF — panel is absent (ENABLE_MONTE_CARLO unset / false)", async () => {
    // Ensure the var is not set (default production behaviour).
    delete process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO;

    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");

    expect(FEATURE_FLAGS.ENABLE_MONTE_CARLO).toBe(false);
  });

  it("flag OFF — explicit 'false' string is still falsy", async () => {
    process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO = "false";

    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");

    expect(FEATURE_FLAGS.ENABLE_MONTE_CARLO).toBe(false);
  });

  it("flag OFF — arbitrary non-'true' string is falsy", async () => {
    process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO = "1";

    const { FEATURE_FLAGS } = await import("@/lib/feature-flags");

    // Only the exact string "true" activates the flag.
    expect(FEATURE_FLAGS.ENABLE_MONTE_CARLO).toBe(false);
  });
});
