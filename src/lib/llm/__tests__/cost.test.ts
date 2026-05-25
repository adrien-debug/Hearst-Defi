import { describe, expect, it } from "vitest";
import {
  estimateKimiCostUsd,
  KIMI_K2_6_INPUT_USD_PER_MTOK,
  KIMI_K2_6_OUTPUT_USD_PER_MTOK,
} from "@/lib/llm/cost";

describe("estimateKimiCostUsd", () => {
  it("calculates the correct price for (1000 in, 500 out)", () => {
    const result = estimateKimiCostUsd({
      prompt_tokens: 1000,
      completion_tokens: 500,
    });

    // Manual: (1000 * 0.60 + 500 * 2.50) / 1_000_000
    //       = (600 + 1250) / 1_000_000
    //       = 1850 / 1_000_000
    //       = 0.00185
    const expected =
      (1000 * KIMI_K2_6_INPUT_USD_PER_MTOK +
        500 * KIMI_K2_6_OUTPUT_USD_PER_MTOK) /
      1_000_000;
    expect(result).toBeCloseTo(expected, 10);
    expect(result).toBe(0.00185);
  });

  it("is deterministic — same input produces the same output", () => {
    const usage = { prompt_tokens: 42_000, completion_tokens: 1_800 };
    expect(estimateKimiCostUsd(usage)).toBe(estimateKimiCostUsd(usage));
  });

  it("returns 0 for zero tokens", () => {
    expect(
      estimateKimiCostUsd({ prompt_tokens: 0, completion_tokens: 0 }),
    ).toBe(0);
  });
});
