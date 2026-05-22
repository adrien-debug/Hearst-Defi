import { ProvenanceBadge, type Provenance } from "@/components/ui/provenance-badge";
import type { PortfolioPosition } from "@/lib/data/portfolio";
import { formatUsdCompact } from "@/lib/format/usd-compact";

/**
 * 12-month value chart — SVG removed, placeholder only.
 *
 * Derives a deterministic monthly series from the positions list:
 * start = sum of principals (subscribed month), end = totalValueUsdc today.
 * Pure function — no fetch, no Date.now().
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildMonthSeries(
  positions: PortfolioPosition[],
  totalValueUsdc: number,
  asOf: Date,
): Array<{ label: string; value: number }> {
  const points = 12;
  const result: Array<{ label: string; value: number }> = [];
  const startValue =
    positions.reduce((s, p) => s + p.principalUsdc, 0) || totalValueUsdc;
  const endValue = totalValueUsdc > 0 ? totalValueUsdc : startValue;

  for (let i = 0; i < points; i++) {
    const monthOffset = -(points - 1 - i);
    const d = new Date(
      Date.UTC(
        asOf.getUTCFullYear(),
        asOf.getUTCMonth() + monthOffset,
        1,
      ),
    );
    const t = i / (points - 1);
    // Smooth monotone curve with a small oscillation for visual depth.
    const wave = Math.sin(i * 0.9) * (endValue - startValue) * 0.04;
    const value = Math.round(startValue + (endValue - startValue) * t + wave);
    result.push({ label: MONTHS[d.getUTCMonth() % 12] ?? "", value });
  }
  return result;
}

interface ValueChartProps {
  positions: PortfolioPosition[];
  totalValueUsdc: number;
  source: "live" | "fallback";
}

export function ValueChart({ positions, totalValueUsdc, source }: ValueChartProps) {
  const provenance: Provenance = source === "fallback" ? "stale" : "estimated";
  const asOf = new Date(); // rendered server-side; consistent within a request
  const series = buildMonthSeries(positions, totalValueUsdc, asOf);

  return (
    <article className="dash-cell" aria-label="Portfolio value — 12-month trend">
      <div className="dash-label">
        <span>Portfolio value · 12-month trend</span>
        <span className="dash-label-meta">
          <ProvenanceBadge kind={provenance} />
          <span className="dash-trend flat">
            {totalValueUsdc > 0 ? formatUsdCompact(totalValueUsdc) : "—"}
          </span>
        </span>
      </div>

      <div
        className="mt-3 block pf-value-chart-placeholder w-full rounded-[var(--ct-radius-md)] bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)]"
        style={{ minHeight: "5rem", maxHeight: "9rem", height: "120px" }}
        aria-hidden="true"
      />

      {/* Month labels */}
      <div className="stat-label ct-text-muted flex justify-between mt-1 mono">
        {series
          .filter((_, i) => i % 3 === 0 || i === series.length - 1)
          .map((s, i) => (
            <span key={i}>{s.label}</span>
          ))}
      </div>

      <p className="body-xs ct-text-muted mt-2 italic">
        Indicative trend based on position history. Past performance does not predict future results.
      </p>
    </article>
  );
}
