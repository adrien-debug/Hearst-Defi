import { describe, expect, it } from "vitest";
import { getPresetInputs, runScenario } from "../scenario";
import type { Preset } from "../types";

const FIXED_NOW = new Date("2026-01-01T00:00:00Z");

const presets: Preset[] = [
  "base",
  "btc_bear",
  "btc_bull",
  "mining_compression",
  "extreme_stress",
];

describe("runScenario snapshots", () => {
  for (const preset of presets) {
    it(`matches snapshot for preset=${preset}`, () => {
      const inputs = getPresetInputs(preset);
      const out = runScenario(inputs, { preset, now: FIXED_NOW });
      expect(out).toMatchSnapshot();
    });
  }

  it("APY range always has low < high with at least 50bps spread", () => {
    for (const preset of presets) {
      const out = runScenario(getPresetInputs(preset), {
        preset,
        now: FIXED_NOW,
      });
      expect(out.apy_range.low).toBeLessThan(out.apy_range.high);
      expect(out.apy_range.high - out.apy_range.low).toBeGreaterThanOrEqual(0.5);
      expect(out.stressed_apy).toBeLessThanOrEqual(out.apy_range.low);
    }
  });

  it("assumptions never contain forbidden words", () => {
    const forbidden = ["promise", "risk-free", "certain", "will deliver"];
    for (const preset of presets) {
      const out = runScenario(getPresetInputs(preset), {
        preset,
        now: FIXED_NOW,
      });
      for (const line of out.assumptions) {
        const lower = line.toLowerCase();
        for (const word of forbidden) {
          expect(lower).not.toContain(word);
        }
      }
    }
  });
});
