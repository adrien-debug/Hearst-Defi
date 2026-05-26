/**
 * SSR-compatible tests for TimelockCountdown.
 *
 * The vitest environment is "node" — no DOM, no hooks execution.
 * We test the pure exported helpers (remainingMs, formatRemaining, progressPct)
 * and verify that instantiating the component with 2 proposals produces 2 widgets
 * by inspecting JSX structure without rendering to DOM.
 *
 * Acceptance criterion: render with 2 TIMELOCK proposals → 2 widgets present.
 */

import { describe, it, expect, vi } from "vitest";
import React from "react";

// ── Stub React hooks (node env, no DOM) ────────────────────────────────────
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useState: (init: unknown) => {
      const value = typeof init === "function" ? (init as () => unknown)() : init;
      return [value, vi.fn()] as [unknown, ReturnType<typeof vi.fn>];
    },
    useEffect: vi.fn(),
    useRef: () => ({ current: null }),
  };
});

import {
  TimelockCountdown,
  remainingMs,
  formatRemaining,
  progressPct,
  type TimelockCountdownProps,
} from "@/components/governance/timelock-countdown";

// ── pure helper tests ────────────────────────────────────────────────────────

describe("remainingMs", () => {
  it("returns positive delta when now is before eta", () => {
    expect(remainingMs(1000, 0)).toBe(1000);
  });

  it("clamps to 0 when now is past eta", () => {
    expect(remainingMs(500, 1000)).toBe(0);
  });

  it("returns 0 when now equals eta", () => {
    expect(remainingMs(1000, 1000)).toBe(0);
  });
});

describe("formatRemaining", () => {
  it("formats a 2-hour window correctly", () => {
    const twoHours = 2 * 60 * 60 * 1000;
    expect(formatRemaining(twoHours)).toBe("2h 0m 0s");
  });

  it("formats 1h 30m 45s correctly", () => {
    const ms = (1 * 3600 + 30 * 60 + 45) * 1000;
    expect(formatRemaining(ms)).toBe("1h 30m 45s");
  });

  it("returns '0h 0m 0s' for 0 ms", () => {
    expect(formatRemaining(0)).toBe("0h 0m 0s");
  });

  it("returns '0h 0m 0s' for negative ms", () => {
    expect(formatRemaining(-5000)).toBe("0h 0m 0s");
  });
});

describe("progressPct", () => {
  it("returns 0 when no time has elapsed", () => {
    const now = 1000;
    const total = 3600_000;
    const eta = now + total;
    expect(progressPct(eta, total, now)).toBe(0);
  });

  it("returns 100 when past eta", () => {
    const eta = 1000;
    const total = 3600_000;
    const now = eta + 1;
    expect(progressPct(eta, total, now)).toBe(100);
  });

  it("returns 50 at exact half-elapsed", () => {
    const total = 3600_000;
    const start = 0;
    const eta = start + total;
    const now = start + total / 2;
    expect(progressPct(eta, total, now)).toBeCloseTo(50, 5);
  });

  it("returns 100 when totalMs is 0 (guard)", () => {
    expect(progressPct(1000, 0, 500)).toBe(100);
  });
});

// ── JSX widget instantiation test ────────────────────────────────────────────

describe("TimelockCountdown widget count", () => {
  const BASE_TIME = "2026-05-26T10:00:00.000Z";

  const proposals: TimelockCountdownProps[] = [
    { proposalId: "42", queueTime: BASE_TIME, delayHours: 48 },
    { proposalId: "43", queueTime: BASE_TIME, delayHours: 24 },
  ];

  it("renders 2 widgets for 2 TIMELOCK proposals", () => {
    // Call the component as a function (RSC / node-env pattern).
    // Each call produces a React element; we verify 2 distinct elements are created.
    const elements = proposals.map((p) =>
      TimelockCountdown(p),
    );

    expect(elements).toHaveLength(2);
    expect(elements[0]).not.toBeNull();
    expect(elements[1]).not.toBeNull();

    // Each element should carry its proposalId in the data attribute
    const el0 = elements[0] as React.ReactElement<{ "data-proposal-id": string }>;
    const el1 = elements[1] as React.ReactElement<{ "data-proposal-id": string }>;
    expect(el0.props["data-proposal-id"]).toBe("42");
    expect(el1.props["data-proposal-id"]).toBe("43");
  });

  it("uses proposalId as the widget key discriminator", () => {
    const el0 = TimelockCountdown(proposals[0]!) as React.ReactElement<{ "data-proposal-id": string }>;
    const el1 = TimelockCountdown(proposals[1]!) as React.ReactElement<{ "data-proposal-id": string }>;
    expect(el0.props["data-proposal-id"]).not.toBe(el1.props["data-proposal-id"]);
  });
});
