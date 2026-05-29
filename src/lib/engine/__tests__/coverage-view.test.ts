import { describe, it, expect } from "vitest";
import { buildCoverageView, type CoverageParts } from "@/lib/engine/coverage-view";

// Complete parts: net = 0.075 × 1e6 × 0.98 × 0.5 × 30 = 1,102,500.
function complete(over: Partial<CoverageParts> = {}): CoverageParts {
  return {
    hashprice_usd_per_th_day: 0.085,
    deployed_th: 1_000_000,
    uptime_pct: 98,
    energy_cost_usd_per_kwh: 0.05,
    revenue_share_fraction: 0.5,
    target_distribution_usdc: 800_000, // ratio ≈ 1.38 → healthy
    period: "2026-05",
    vault_ref: "hearst-yield-vault",
    ...over,
  };
}

describe("buildCoverageView — provenance states", () => {
  it("missing input → pending (lists missingInputs, recommendation suspend)", () => {
    const v = buildCoverageView(complete({ hashprice_usd_per_th_day: undefined }));
    expect(v.provenance).toBe("pending");
    expect(v.state).toBe("invalid");
    expect(v.ratio).toBeNull();
    expect(v.missingInputs).toContain("hashprice_usd_per_th_day");
    expect(v.recommendation.action).toBe("suspend");
    expect(v.healthy).toBe(false);
  });

  it("complete but manual/mixed source → estimated", () => {
    const v = buildCoverageView(complete({ attested: false, anyManual: true }));
    expect(v.provenance).toBe("estimated");
    expect(v.state).toBe("healthy");
    expect(v.recommendation.action).toBe("normal");
  });

  it("complete + attested + no manual → live", () => {
    const v = buildCoverageView(complete({ attested: true, anyManual: false }));
    expect(v.provenance).toBe("live");
    expect(v.ratio).toBeGreaterThan(1.25);
  });

  it("present but invalid value → invalid (not pending)", () => {
    const v = buildCoverageView(complete({ uptime_pct: 150 }));
    expect(v.provenance).toBe("invalid");
    expect(v.state).toBe("invalid");
  });
});

describe("buildCoverageView — invariants", () => {
  it("recommendation follows the ratio (low coverage → suspend)", () => {
    const v = buildCoverageView(complete({ target_distribution_usdc: 1_600_000 }));
    expect(v.state).toBe("suspended");
    expect(v.recommendation.action).toBe("suspend");
    expect(v.recommendation.maxPayout).toBe(0);
  });

  it("NO Live without complete inputs (attested but missing → pending)", () => {
    const v = buildCoverageView(complete({ deployed_th: undefined, attested: true }));
    expect(v.provenance).toBe("pending");
    expect(v.provenance).not.toBe("live");
  });

  it("NO healthy when ratio < 1.0", () => {
    const v = buildCoverageView(complete({ target_distribution_usdc: 1_250_000 }));
    expect(v.ratio).toBeLessThan(1.0);
    expect(v.healthy).toBe(false);
  });
});
