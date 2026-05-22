import { describe, expect, it } from "vitest";

import {
  ALLOCATION_DASH_TONE,
  ALLOCATION_STROKE,
  allocationDashToneFor,
  allocationStrokeFor,
} from "@/lib/allocation-colors";

describe("allocation-colors", () => {
  it("maps engine buckets to dashboard bento strokes", () => {
    expect(ALLOCATION_STROKE.mining).toBe("var(--ct-text-strong)");
    expect(ALLOCATION_STROKE.btc_tactical).toBe("var(--ct-accent-strong)");
    expect(ALLOCATION_STROKE.usdc_base).toBe("var(--ct-accent-soft)");
    expect(ALLOCATION_STROKE.stable_reserve).toBe("var(--ct-surface-3)");
  });

  it("maps hyphen mock ids to the same strokes", () => {
    expect(allocationStrokeFor("btc-tactical")).toBe(ALLOCATION_STROKE.btc_tactical);
    expect(allocationStrokeFor("usdc-base")).toBe(ALLOCATION_STROKE.usdc_base);
    expect(allocationDashToneFor("stable-reserve")).toBe("muted");
  });

  it("keeps dash tone classes aligned with strokes", () => {
    expect(ALLOCATION_DASH_TONE.mining).toBe("primary");
    expect(ALLOCATION_DASH_TONE.btc_tactical).toBe("accent");
  });
});
