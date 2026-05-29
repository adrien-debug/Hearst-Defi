import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  canSeedCoverageDemo,
  buildDemoMiningMetric,
  buildDemoDistribution,
  periodOf,
  DEMO_MARKER,
} from "@/lib/dev/coverage-demo";
import { buildCoverageView } from "@/lib/engine/coverage-view";
import { MiningCashFlowEvidence } from "@/components/proof-center/mining-cashflow-evidence";

const NOW = new Date("2026-05-15T00:00:00Z");

describe("coverage demo seed — env guard (P1.5)", () => {
  it("blocks in production without override", () => {
    expect(canSeedCoverageDemo("production", undefined)).toBe(false);
    expect(canSeedCoverageDemo("production", "false")).toBe(false);
  });
  it("allows in production only with explicit override", () => {
    expect(canSeedCoverageDemo("production", "true")).toBe(true);
  });
  it("allows outside production", () => {
    expect(canSeedCoverageDemo("development", undefined)).toBe(true);
    expect(canSeedCoverageDemo("test", undefined)).toBe(true);
  });
});

describe("coverage demo seed — demo rows", () => {
  it("builds a demo MiningMetric marked demo (never attested)", () => {
    const m = buildDemoMiningMetric();
    expect(m.hashprice).toBeGreaterThan(0);
    expect(m.deployedHashrate).toBeGreaterThan(0);
    expect(m.summary).toBe(DEMO_MARKER);
    expect(m.recommendation).toBe(DEMO_MARKER);
  });
  it("builds a demo Distribution target for the current period", () => {
    const period = periodOf(NOW);
    const d = buildDemoDistribution(NOW, period, "hearst-yield-vault");
    expect(d.period).toBe("2026-05");
    expect(d.amountUsdc).toBe(800_000);
    expect(d.status).toBe("scheduled");
    expect(d.vaultRef).toBe("hearst-yield-vault");
  });
});

describe("coverage demo → Estimated, never Live", () => {
  // Reproduce what the loader assembles from demo rows + env revenue-share.
  function demoParts(over = {}) {
    const m = buildDemoMiningMetric();
    const d = buildDemoDistribution(NOW, periodOf(NOW), "hearst-yield-vault");
    return {
      hashprice_usd_per_th_day: m.hashprice,
      deployed_th: m.deployedHashrate,
      uptime_pct: m.uptimePct,
      energy_cost_usd_per_kwh: m.energyCost,
      revenue_share_fraction: 0.4, // from env MINING_REVENUE_SHARE_BPS=4000
      target_distribution_usdc: d.amountUsdc,
      period: d.period,
      vault_ref: d.vaultRef,
      attested: false, // demo NEVER attested
      anyManual: true, // env revenue-share is manual
      ...over,
    };
  }

  it("resolves to Estimated with demo inputs + manual revenue-share", () => {
    const v = buildCoverageView(demoParts());
    expect(v.provenance).toBe("estimated");
    expect(v.ratio).not.toBeNull();
  });

  it("is NEVER Live with a demo source (no attestation)", () => {
    // Even if someone wrongly flips attested, anyManual (env share) keeps it estimated.
    const v = buildCoverageView(demoParts({ attested: true }));
    expect(v.provenance).not.toBe("live");
    expect(v.provenance).toBe("estimated");
  });

  it("without revenue-share → Pending (not fabricated)", () => {
    const v = buildCoverageView(demoParts({ revenue_share_fraction: undefined }));
    expect(v.provenance).toBe("pending");
  });
});

describe("Proof Center UI copy for Estimated", () => {
  it("shows 'Estimated' and 'Not attested', never 'Live'", () => {
    const v = buildCoverageView({
      hashprice_usd_per_th_day: 0.085,
      deployed_th: 1_000_000,
      uptime_pct: 98,
      energy_cost_usd_per_kwh: 0.05,
      revenue_share_fraction: 0.4,
      target_distribution_usdc: 800_000,
      attested: false,
      anyManual: true,
    });
    const html = renderToStaticMarkup(<MiningCashFlowEvidence coverage={v} />);
    expect(html).toContain("Estimated");
    expect(html.toLowerCase()).toContain("not attested");
    expect(html).not.toContain("Data provenance: Live");
  });
});
