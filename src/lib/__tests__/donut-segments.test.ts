import { describe, expect, it } from "vitest";

import { buildDonutSegments } from "@/lib/charts/donut-segments";

describe("buildDonutSegments", () => {
  it("builds dash arrays that sum to one full turn", () => {
    const segs = buildDonutSegments([
      { pct: 40 },
      { pct: 35 },
      { pct: 25 },
    ]);
    expect(segs).toHaveLength(3);
    expect(segs[0]?.dashArray).toBe("40 60");
    expect(segs[0]?.dashOffset ?? 0).toBe(0);
    expect(segs[1]?.dashArray).toBe("35 65");
    expect(segs[1]?.dashOffset).toBe(-40);
    expect(segs[2]?.dashArray).toBe("25 75");
    expect(segs[2]?.dashOffset).toBe(-75);
  });
});
