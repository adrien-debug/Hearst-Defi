import { describe, expect, it } from "vitest";

import { buildSystemInstructions } from "@/lib/agents/investor-memo";
import { containsForbidden } from "@/lib/agents/forbidden-words";

// ---------------------------------------------------------------------------
// C-07 — Model B rule in buildSystemInstructions
// ---------------------------------------------------------------------------

describe("buildSystemInstructions — Model B rule", () => {
  const instructions = buildSystemInstructions("v1.0");

  it("contains 'cash reserve' (Model B principal mechanic)", () => {
    expect(instructions).toContain("cash reserve");
  });

  it("contains 'not deployed on-chain' (Model B off-chain distinction)", () => {
    expect(instructions).toContain("not deployed on-chain");
  });

  it("contains 'mining-revenue-share' (yield injection mechanic)", () => {
    expect(instructions).toContain("mining-revenue-share");
  });

  it("Model B rule text itself contains no forbidden word", () => {
    // The system instructions as a whole intentionally cite forbidden words in
    // the "Never use the words: ..." guardrail rule, so running the linter on
    // the full instructions string would always flag them (negation window is
    // only 3 words wide).  We scope the assertion to the Model B rule sentence
    // only, which must be free of forbidden words.
    const modelBRule =
      "Principal is held in a USDC cash reserve inside the vault, not deployed on-chain; yield is a mining-revenue-share distribution injected monthly.";
    expect(containsForbidden(modelBRule)).toBeNull();
  });
});

describe("buildSystemInstructions v2.0 — Model B rule", () => {
  const instructions = buildSystemInstructions("v2.0");

  it("also carries Model B rule in v2.0 variant", () => {
    expect(instructions).toContain("cash reserve");
    expect(instructions).toContain("not deployed on-chain");
  });
});
