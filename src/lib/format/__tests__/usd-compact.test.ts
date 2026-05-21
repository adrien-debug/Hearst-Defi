import { describe, expect, it } from "vitest";

import { formatUsdCompact } from "../usd-compact";

describe("formatUsdCompact", () => {
  it("formats thousands without trailing .0 (SSR/client stable)", () => {
    expect(formatUsdCompact(500_000)).toBe("$500K");
    expect(formatUsdCompact(542_300)).toBe("$542.3K");
  });

  it("formats millions", () => {
    expect(formatUsdCompact(1_250_000)).toBe("$1.3M");
  });

  it("formats sub-thousand", () => {
    expect(formatUsdCompact(850)).toBe("$850");
  });
});
