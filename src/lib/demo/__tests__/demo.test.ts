/**
 * Tests for the demo-mode primitives.
 *
 * `next/headers` is mocked at module level so `isDemoMode()` can be exercised
 * outside an RSC context. We never reach the real Next.js implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// next/headers mock — a tiny stateful store we can drive from each test.
// ---------------------------------------------------------------------------

interface MockCookieStore {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string): void;
  delete(name: string): void;
}

const mockStore: { cookies: Map<string, string> } = { cookies: new Map() };

vi.mock("next/headers", () => ({
  cookies: vi.fn(
    async (): Promise<MockCookieStore> => ({
      get(name: string) {
        const v = mockStore.cookies.get(name);
        return v === undefined ? undefined : { value: v };
      },
      set(name: string, value: string) {
        mockStore.cookies.set(name, value);
      },
      delete(name: string) {
        mockStore.cookies.delete(name);
      },
    }),
  ),
}));

const ORIGINAL_DEMO_DEFAULT = process.env.DEMO_MODE_DEFAULT;

beforeEach(() => {
  mockStore.cookies.clear();
  delete process.env.DEMO_MODE_DEFAULT;
});

afterEach(() => {
  if (ORIGINAL_DEMO_DEFAULT === undefined) {
    delete process.env.DEMO_MODE_DEFAULT;
  } else {
    process.env.DEMO_MODE_DEFAULT = ORIGINAL_DEMO_DEFAULT;
  }
});

describe("isDemoMode()", () => {
  it("returns true when DEMO_MODE_DEFAULT=1", async () => {
    process.env.DEMO_MODE_DEFAULT = "1";
    const { isDemoMode } = await import("../index");
    expect(await isDemoMode()).toBe(true);
  });

  it("returns true when the hearst-demo-mode cookie is set to 1", async () => {
    mockStore.cookies.set("hearst-demo-mode", "1");
    const { isDemoMode } = await import("../index");
    expect(await isDemoMode()).toBe(true);
  });

  it("returns false when neither env nor cookie is set", async () => {
    const { isDemoMode } = await import("../index");
    expect(await isDemoMode()).toBe(false);
  });

  it("returns false when the cookie value is not exactly '1'", async () => {
    mockStore.cookies.set("hearst-demo-mode", "true");
    const { isDemoMode } = await import("../index");
    expect(await isDemoMode()).toBe(false);
  });
});

describe("withDemoFallback()", () => {
  it("returns the demo value when in demo mode and never calls the real loader", async () => {
    process.env.DEMO_MODE_DEFAULT = "1";
    const { withDemoFallback } = await import("../index");

    const realLoader = vi.fn(async () => "REAL");
    const result = await withDemoFallback(realLoader, "DEMO");

    expect(result).toBe("DEMO");
    expect(realLoader).not.toHaveBeenCalled();
  });

  it("accepts a thunk for demoData and only invokes it when needed", async () => {
    process.env.DEMO_MODE_DEFAULT = "1";
    const { withDemoFallback } = await import("../index");

    const thunk = vi.fn(() => ({ aum: 42 }));
    const realLoader = vi.fn(async () => ({ aum: 1 }));
    const result = await withDemoFallback(realLoader, thunk);

    expect(result).toEqual({ aum: 42 });
    expect(thunk).toHaveBeenCalledTimes(1);
    expect(realLoader).not.toHaveBeenCalled();
  });

  it("calls the real loader outside demo mode and ignores the demo value", async () => {
    const { withDemoFallback } = await import("../index");

    const realLoader = vi.fn(async () => "REAL");
    const thunk = vi.fn(() => "DEMO");
    const result = await withDemoFallback(realLoader, thunk);

    expect(result).toBe("REAL");
    expect(realLoader).toHaveBeenCalledTimes(1);
    expect(thunk).not.toHaveBeenCalled();
  });
});
