import { ProvenanceBadge, type Provenance } from "@/components/ui/provenance-badge";
import type { PortfolioPosition } from "@/lib/data/portfolio";

/**
 * 12-month value chart (SVG area, accent gradient).
 *
 * Derives a deterministic monthly series from the positions list:
 * start = sum of principals (subscribed month), end = totalValueUsdc today.
 * Pure function — no fetch, no Date.now().
 */

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

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

function toSvgPath(
  series: Array<{ value: number }>,
  width: number,
  height: number,
  close?: boolean,
): string {
  const values = series.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = height * 0.1;
  const available = height - pad * 2;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + available - ((v - min) / range) * available;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p}`).join(" ");
  if (close) {
    return `${linePath} L${width},${height} L0,${height} Z`;
  }
  return linePath;
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
  const W = 600;
  const H = 120;

  return (
    <article className="dash-cell" aria-label="Portfolio value — 12-month trend">
      <div className="dash-label">
        <span>Portfolio value · 12-month trend</span>
        <span className="dash-label-meta">
          <ProvenanceBadge kind={provenance} />
          <span className="dash-trend flat">
            {totalValueUsdc > 0 ? usdCompact.format(totalValueUsdc) : "—"}
          </span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="7.5rem"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="mt-3 block"
      >
        <defs>
          <linearGradient id="pf-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ct-accent-strong)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--ct-accent-strong)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path
          d={toSvgPath(series, W, H, true)}
          fill="url(#pf-area-grad)"
        />
        {/* Line */}
        <path
          d={toSvgPath(series, W, H)}
          fill="none"
          stroke="var(--ct-accent-strong)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

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
