import { describe, it, expect } from "vitest";
import { getPresetInputs, runScenario } from "../scenario";

// B1 — the engine widens tight APY bands to a minimum display spread. That
// adjustment must be disclosed in the scenario assumptions (which flow into the
// Scenario Lab and the investor memo), so a range is never read as a precise
// measurement.
describe("APY range — minimum display spread is disclosed (B1)", () => {
  it("includes a 'minimum display spread' line in the assumptions", () => {
    const inputs = getPresetInputs("base");
    const out = runScenario(inputs);
    const disclosed = out.assumptions.some((a) =>
      a.toLowerCase().includes("minimum display spread"),
    );
    expect(disclosed).toBe(true);
  });
});
