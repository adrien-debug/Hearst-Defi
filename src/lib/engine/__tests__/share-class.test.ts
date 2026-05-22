import { describe, expect, it } from "vitest";

import {
  accrueManagementFee,
  lockupStatus,
  meetsMinimum,
  netDistributableYield,
  performanceFee,
  SHARE_CLASS_A,
  SHARE_CLASS_B,
} from "../share-class";

describe("canonical presets", () => {
  it("match the roadmap terms (A = 1%+10%/250k/60d, B = 0.75%+8%/1M/90d)", () => {
    expect(SHARE_CLASS_A).toMatchObject({
      minTicketUsdc: 250_000,
      softLockupDays: 60,
      mgmtFeeBps: 100,
      perfFeeBps: 1_000,
    });
    expect(SHARE_CLASS_B).toMatchObject({
      minTicketUsdc: 1_000_000,
      softLockupDays: 90,
      mgmtFeeBps: 75,
      perfFeeBps: 800,
    });
  });
});

describe("meetsMinimum", () => {
  it("enforces the class minimum ticket", () => {
    expect(meetsMinimum(250_000, SHARE_CLASS_A)).toBe(true);
    expect(meetsMinimum(249_999, SHARE_CLASS_A)).toBe(false);
    expect(meetsMinimum(250_000, SHARE_CLASS_B)).toBe(false);
  });
});

describe("accrueManagementFee", () => {
  it("pro-rates the annual rate by day count", () => {
    expect(accrueManagementFee(10_000_000, 365, SHARE_CLASS_A)).toBe(100_000); // 1% of 10M
    expect(accrueManagementFee(10_000_000, 182, SHARE_CLASS_A)).toBeCloseTo(49_863.01, 1);
    expect(accrueManagementFee(0, 365, SHARE_CLASS_A)).toBe(0);
  });
});

describe("performanceFee", () => {
  it("charges carry on profit with no hurdle (class A)", () => {
    expect(performanceFee(1_000_000, 10_000_000, 365, SHARE_CLASS_A)).toBe(100_000); // 10%
    expect(performanceFee(0, 10_000_000, 365, SHARE_CLASS_A)).toBe(0);
  });

  it("only charges carry above a hurdle", () => {
    const withHurdle = { ...SHARE_CLASS_A, hurdleBps: 500 }; // 5% annual hurdle
    // hurdle = 10M × 5% = 500k; profit 1M → excess 500k → carry 10% = 50k
    expect(performanceFee(1_000_000, 10_000_000, 365, withHurdle)).toBe(50_000);
    // profit below hurdle → no carry
    expect(performanceFee(400_000, 10_000_000, 365, withHurdle)).toBe(0);
  });
});

describe("netDistributableYield", () => {
  it("applies management fee first, then carry on the remainder", () => {
    const r = netDistributableYield(1_000_000, 10_000_000, 10_000_000, 365, SHARE_CLASS_A);
    expect(r.mgmtFeeUsdc).toBe(100_000); // 1% of 10M
    expect(r.perfFeeUsdc).toBe(90_000); // 10% of (1M − 100k)
    expect(r.netDistributableUsdc).toBe(810_000);
  });
});

describe("lockupStatus", () => {
  const subscribedAt = new Date("2026-01-01T00:00:00Z");

  it("is locked inside the soft-lockup window", () => {
    const s = lockupStatus(subscribedAt, new Date("2026-02-01T00:00:00Z"), SHARE_CLASS_A);
    expect(s.locked).toBe(true);
    expect(s.unlockDate.toISOString()).toBe("2026-03-02T00:00:00.000Z"); // +60d
    expect(s.daysRemaining).toBe(29);
  });

  it("is unlocked after the window", () => {
    const s = lockupStatus(subscribedAt, new Date("2026-04-01T00:00:00Z"), SHARE_CLASS_A);
    expect(s.locked).toBe(false);
    expect(s.daysRemaining).toBe(0);
  });
});
