import { describe, expect, it } from "vitest";

import {
  buildMiningMetricRows,
  dayKeyOf,
  selectNewRows,
} from "../backfill";
import type { DailyMarketPoint } from "../history";

const points: DailyMarketPoint[] = [
  { date: new Date("2024-01-01"), btcUsd: 60_000, difficulty: 1e14 },
  { date: new Date("2024-01-02"), btcUsd: 66_000, difficulty: 1e14 },
  { date: new Date("2024-01-03"), btcUsd: 66_000, difficulty: 1.1e14 },
];

describe("buildMiningMetricRows", () => {
  const rows = buildMiningMetricRows(points);

  it("derives one row per day at noon UTC", () => {
    expect(rows).toHaveLength(3);
    expect(rows[0]?.takenAt.toISOString()).toBe("2024-01-01T12:00:00.000Z");
  });

  it("keeps every score within its bounds and hashprice positive", () => {
    for (const r of rows) {
      expect(r.hashprice).toBeGreaterThan(0);
      expect(r.miningMarginScore).toBeGreaterThanOrEqual(0);
      expect(r.miningMarginScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r.miningMarginScore)).toBe(true);
      expect(r.operationalConfidence).toBeGreaterThanOrEqual(0);
      expect(r.operationalConfidence).toBeLessThanOrEqual(100);
    }
  });

  it("starts the hashprice trend at 0 and tracks subsequent moves", () => {
    expect(rows[0]?.hashpriceTrendPct).toBe(0);
    // Day 2: BTC +10% at constant difficulty → hashprice up ~10%.
    expect(rows[1]?.hashpriceTrendPct).toBeGreaterThan(8);
    // Day 3: difficulty +10% at constant BTC → hashprice down.
    expect(rows[2]?.hashpriceTrendPct).toBeLessThan(0);
  });

  it("is deterministic", () => {
    expect(buildMiningMetricRows(points)).toEqual(rows);
  });
});

describe("selectNewRows / dayKeyOf", () => {
  it("formats day keys as YYYY-MM-DD (UTC)", () => {
    expect(dayKeyOf(new Date("2024-01-02T12:00:00Z"))).toBe("2024-01-02");
  });

  it("drops rows whose day already exists", () => {
    const rows = buildMiningMetricRows(points);
    const existing = new Set([dayKeyOf(rows[0]!.takenAt)]);
    const fresh = selectNewRows(rows, existing);
    expect(fresh).toHaveLength(2);
    expect(fresh.map((r) => dayKeyOf(r.takenAt))).toEqual([
      "2024-01-02",
      "2024-01-03",
    ]);
  });
});
