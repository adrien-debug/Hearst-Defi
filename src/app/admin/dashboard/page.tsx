import "@/app/(product)/charts-shared.css";

import { Metric } from "@/components/ui/metric";
import { Card } from "@/components/ui/card";
import { ApyRange } from "@/components/ui/apy-range";
import { AllocationDonut } from "@/components/dashboard/dashboard-charts";
import { allocationStrokeFor, allocationLabelFor } from "@/lib/allocation-colors";
import { loadDashboardData } from "@/lib/demo/loaders";
import { loadCustody } from "@/lib/data/custody";

export const dynamic = "force-dynamic";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export default async function DashboardPage() {
  const [data, custody] = await Promise.all([loadDashboardData(), loadCustody()]);
  const { vault } = data;

  // Donut segments — canonical SVG convention (C=100): dashArray = pct, offset
  // is the running cumulative so each arc starts where the previous ended.
  // Offset is derived immutably (sum of preceding pcts) — no render-time mutation.
  const allocSegments = data.allocations.map((a, i) => ({
    bucket: a.bucket,
    pct: a.pct,
    valueUsdc: a.valueUsdc,
    dashArray: `${a.pct} ${100 - a.pct}`,
    dashOffset: -data.allocations
      .slice(0, i)
      .reduce((sum, prev) => sum + prev.pct, 0),
  }));

  return (
    <section className="ct-section space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Hearst Yield Vault</p>
        <h1 className="h1">Dashboard</h1>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="AUM"
          provenance={custody.provenance}
          value={usdCompact.format(custody.totalUsdcReserves)}
          sublabel={custody.configured ? "USDC reserves · Fireblocks" : "Fireblocks scope not pinned"}
        />
        <Metric
          label="Target APY range"
          provenance="estimated"
          value={<ApyRange low={vault.apyRange.low} high={vault.apyRange.high} precision={1} />}
        />
        <Metric
          label="Risk score"
          provenance="estimated"
          value={<span className="tabular">{vault.riskScore}</span>}
          sublabel="out of 100"
        />
        <Metric
          label="Mining margin"
          provenance="estimated"
          value={<span className="tabular">{vault.miningMarginScore}</span>}
          sublabel="out of 100"
        />
      </div>

      <Card>
        <p className="eyebrow mb-4">Allocation breakdown</p>
        {allocSegments.length === 0 ? (
          <p className="body-sm ct-text-muted">No allocation data yet.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-8">
            <div className="h-40 w-40 shrink-0">
              <AllocationDonut
                segments={allocSegments}
                ariaLabel="Allocation breakdown by bucket"
              />
            </div>
            <ul className="flex min-w-56 flex-1 flex-col gap-2">
              {allocSegments.map((s) => (
                <li
                  key={s.bucket}
                  className="flex items-center justify-between gap-3 body-sm"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: allocationStrokeFor(s.bucket) }}
                    />
                    {allocationLabelFor(s.bucket)}
                  </span>
                  <span className="tabular ct-text-muted">
                    {s.pct.toFixed(0)}% · {usdCompact.format(s.valueUsdc)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </section>
  );
}
