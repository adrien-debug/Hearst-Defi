import { describe, expect, it } from "vitest";

import {
  halfGaugeRangeBand,
  halfGaugeSingleValue,
} from "@/lib/charts/half-gauge";

describe("half-gauge", () => {
  it("maps APY range to stroke dash", () => {
    const { strokeDasharray, strokeDashoffset } = halfGaugeRangeBand(8, 14, 20);
    expect(strokeDasharray).toMatch(/^\d+(\.\d+)? \d+(\.\d+)?$/);
    expect(strokeDashoffset).toBeLessThanOrEqual(0);
  });

  it("maps single confidence value", () => {
    const { strokeDasharray } = halfGaugeSingleValue(70, 100);
    expect(strokeDasharray).toBe("35 65");
  });
});
