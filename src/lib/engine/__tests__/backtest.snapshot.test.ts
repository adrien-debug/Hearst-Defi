import { describe, expect, it } from "vitest";
import { runBacktest } from "../backtest";
import type { BacktestKey } from "../types";

const FIXED_NOW = new Date("2026-01-01T00:00:00Z");

const keys: BacktestKey[] = ["bear_2022", "etf_halving_2024", "mining_crunch_2024"];

describe("runBacktest snapshots", () => {
  for (const key of keys) {
    it(`matches snapshot for key=${key}`, () => {
      const out = runBacktest(key, { now: FIXED_NOW });
      expect(out).toMatchSnapshot();
    });
  }
});
