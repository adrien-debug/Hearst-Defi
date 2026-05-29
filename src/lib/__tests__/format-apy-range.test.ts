import { describe, expect, it } from "vitest";

import { formatApyRange } from "@/app/api/statements/[id]/pdf/route";

// ---------------------------------------------------------------------------
// C-06 — formatApyRange
// ---------------------------------------------------------------------------

describe("formatApyRange", () => {
  it("formats the default range 940/1280 as '9.4–12.8%'", () => {
    expect(formatApyRange(940, 1280)).toBe("9.4–12.8%");
  });

  it("formats 800/1500 as '8.0–15.0%'", () => {
    expect(formatApyRange(800, 1500)).toBe("8.0–15.0%");
  });

  it("uses an en-dash (U+2013) separator", () => {
    const result = formatApyRange(900, 1200);
    expect(result).toContain("–");
  });

  it("ends with a percent sign", () => {
    expect(formatApyRange(940, 1280)).toMatch(/%$/);
  });

  it("produces one decimal place for both bounds", () => {
    // 1000 bps = 10.0%, 1100 bps = 11.0%
    expect(formatApyRange(1000, 1100)).toBe("10.0–11.0%");
  });
});
