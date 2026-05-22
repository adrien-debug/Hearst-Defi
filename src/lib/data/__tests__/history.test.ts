import { describe, expect, it } from "vitest";

import {
  eachUtcDay,
  mergeDailyHistory,
  parseCoingeckoMarketChart,
  parseMempoolDifficultyAdjustments,
  startOfUtcDay,
  syntheticBtcSeries,
  syntheticDifficultySeries,
  type DailyValue,
} from "../history";

const d = (s: string) => new Date(s);

describe("eachUtcDay", () => {
  it("is inclusive of both ends", () => {
    const days = eachUtcDay(d("2024-01-01"), d("2024-01-10"));
    expect(days).toHaveLength(10);
    expect(days[0]).toEqual(startOfUtcDay(d("2024-01-01")));
    expect(days[9]).toEqual(startOfUtcDay(d("2024-01-10")));
  });
});

describe("synthetic series", () => {
  it("are deterministic", () => {
    const a = syntheticBtcSeries(d("2023-01-01"), d("2023-03-01"));
    const b = syntheticBtcSeries(d("2023-01-01"), d("2023-03-01"));
    expect(a).toEqual(b);
    expect(syntheticDifficultySeries(d("2023-01-01"), d("2023-02-01"))).toEqual(
      syntheticDifficultySeries(d("2023-01-01"), d("2023-02-01")),
    );
  });

  it("stay positive and within a believable band", () => {
    for (const p of syntheticBtcSeries(d("2023-05-01"), d("2026-05-01"))) {
      expect(p.value).toBeGreaterThan(5_000);
      expect(p.value).toBeLessThan(200_000);
    }
    for (const p of syntheticDifficultySeries(d("2023-05-01"), d("2026-05-01"))) {
      expect(p.value).toBeGreaterThan(1e13);
      expect(p.value).toBeLessThan(2e14);
    }
  });
});

describe("parseCoingeckoMarketChart", () => {
  it("maps prices to one value per UTC day, last wins", () => {
    const parsed = parseCoingeckoMarketChart({
      prices: [
        [Date.UTC(2024, 0, 1, 1), 42_000],
        [Date.UTC(2024, 0, 1, 23), 42_500], // same day → overrides
        [Date.UTC(2024, 0, 2, 12), 43_000],
      ],
    });
    expect(parsed).not.toBeNull();
    expect(parsed).toHaveLength(2);
    expect(parsed?.[0]?.value).toBe(42_500);
    expect(parsed?.[1]?.value).toBe(43_000);
  });

  it("returns null on shape mismatch", () => {
    expect(parseCoingeckoMarketChart(null)).toBeNull();
    expect(parseCoingeckoMarketChart({ prices: "nope" })).toBeNull();
    expect(parseCoingeckoMarketChart({ prices: [] })).toBeNull();
  });
});

describe("parseMempoolDifficultyAdjustments", () => {
  it("extracts difficulty steps sorted ascending", () => {
    const parsed = parseMempoolDifficultyAdjustments([
      [1_700_000_000, 800_000, 1.1e14, 2.3],
      [1_690_000_000, 790_000, 1.0e14, 1.0],
    ]);
    expect(parsed).toHaveLength(2);
    expect(parsed?.[0]?.value).toBe(1.0e14);
    expect(parsed?.[1]?.value).toBe(1.1e14);
  });

  it("returns null when nothing parses", () => {
    expect(parseMempoolDifficultyAdjustments({})).toBeNull();
    expect(parseMempoolDifficultyAdjustments([["x", "y"]])).toBeNull();
  });
});

describe("mergeDailyHistory", () => {
  const days = eachUtcDay(d("2024-01-01"), d("2024-01-10"));

  it("carries BTC forward and forward-fills difficulty", () => {
    const btc: DailyValue[] = [
      { date: startOfUtcDay(d("2024-01-01")), value: 50_000 },
      { date: startOfUtcDay(d("2024-01-05")), value: 60_000 },
    ];
    const difficulty: DailyValue[] = [
      { date: startOfUtcDay(d("2023-12-20")), value: 1.0e14 }, // before range
      { date: startOfUtcDay(d("2024-01-06")), value: 1.1e14 }, // steps mid-range
    ];

    const points = mergeDailyHistory(days, btc, difficulty);
    expect(points).toHaveLength(10);
    expect(points[0]?.btcUsd).toBe(50_000);
    expect(points[3]?.btcUsd).toBe(50_000); // carried until next known
    expect(points[4]?.btcUsd).toBe(60_000);
    expect(points[4]?.difficulty).toBe(1.0e14); // 2024-01-05, before the step
    expect(points[5]?.difficulty).toBe(1.1e14); // 2024-01-06 == step date, applies
  });

  it("falls back to synthetic backstops with no real data (never NaN)", () => {
    const points = mergeDailyHistory(days, [], []);
    expect(points).toHaveLength(10);
    for (const p of points) {
      expect(Number.isFinite(p.btcUsd)).toBe(true);
      expect(p.btcUsd).toBeGreaterThan(0);
      expect(Number.isFinite(p.difficulty)).toBe(true);
      expect(p.difficulty).toBeGreaterThan(0);
    }
  });
});
