import { describe, expect, it } from "vitest";

import {
  BLOCK_REWARD_BTC,
  BLOCKS_PER_DAY,
  deriveHashpriceUsdPerThDay,
  networkHashrateThs,
} from "../hashprice-formula";

describe("deriveHashpriceUsdPerThDay", () => {
  it("produces a plausible hashprice for current-era inputs", () => {
    const hp = deriveHashpriceUsdPerThDay(1.32e14, 100_000);
    expect(hp).toBeGreaterThan(0.02);
    expect(hp).toBeLessThan(0.12);
  });

  it("matches the closed-form definition", () => {
    const difficulty = 1.1e14;
    const btc = 80_000;
    const expected =
      (BLOCK_REWARD_BTC * BLOCKS_PER_DAY * btc) / networkHashrateThs(difficulty);
    expect(deriveHashpriceUsdPerThDay(difficulty, btc)).toBeCloseTo(expected, 9);
  });

  it("rises with BTC price and falls with difficulty", () => {
    const base = deriveHashpriceUsdPerThDay(1e14, 60_000);
    expect(deriveHashpriceUsdPerThDay(1e14, 90_000)).toBeGreaterThan(base);
    expect(deriveHashpriceUsdPerThDay(1.5e14, 60_000)).toBeLessThan(base);
  });

  it("returns 0 for degenerate inputs instead of NaN/Infinity", () => {
    expect(deriveHashpriceUsdPerThDay(0, 100_000)).toBe(0);
    expect(deriveHashpriceUsdPerThDay(1e14, 0)).toBe(0);
    expect(deriveHashpriceUsdPerThDay(-1, 100_000)).toBe(0);
    expect(deriveHashpriceUsdPerThDay(Number.NaN, 100_000)).toBe(0);
  });
});
