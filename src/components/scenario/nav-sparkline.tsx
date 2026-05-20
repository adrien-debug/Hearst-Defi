import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import type { ScenarioOutput } from "@/lib/engine/types";

// ── NAV projection series ─────────────────────────────────────────────────────
//
// Renders a 12-month projected NAV sparkline from the engine's apy_range.
// The series shows LOW, MID, and HIGH bands.
// All math here is purely display formatting of the engine's output numbers —
// compound interest layout for rendering only (no new business logic).

const INITIAL_NAV = 1_000_000; // illustrative $1M notional
// 10px = --ct-text-micro (SVG cannot read CSS vars at runtime)
const CHART_LABEL_SIZE = 10;
const MONTHS = 12;

interface NavPoint {
  month: number;
  low: number;
  mid: number;
  high: number;
}

function buildNavSeries(
  apyLow: number,
  apyHigh: number,
): NavPoint[] {
  const midApy = (apyLow + apyHigh) / 2;
  const monthlyLow = Math.pow(1 + apyLow / 100, 1 / 12) - 1;
  const monthlyMid = Math.pow(1 + midApy / 100, 1 / 12) - 1;
  const monthlyHigh = Math.pow(1 + apyHigh / 100, 1 / 12) - 1;

  const series: NavPoint[] = [];
  let navLow = INITIAL_NAV;
  let navMid = INITIAL_NAV;
  let navHigh = INITIAL_NAV;

  for (let m = 1; m <= MONTHS; m++) {
    navLow *= 1 + monthlyLow;
    navMid *= 1 + monthlyMid;
    navHigh *= 1 + monthlyHigh;
    series.push({ month: m, low: navLow, mid: navMid, high: navHigh });
  }
  return series;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(3)}M`;
  return `$${(n / 1_000).toFixed(0)}K`;
}

// ── SVG sparkline ─────────────────────────────────────────────────────────────

interface SparklineProps {
  series: NavPoint[];
}

function Sparkline({ series }: SparklineProps) {
  const W = 600;
  const H = 120;
  const PAD_X = 8;
  const PAD_Y = 10;

  const allValues = series.flatMap((p) => [p.low, p.high]);
  const minVal = Math.min(...allValues) * 0.998;
  const maxVal = Math.max(...allValues) * 1.002;
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const count = series.length;

  function xOf(i: number): number {
    return PAD_X + ((i / (count - 1)) * (W - PAD_X * 2));
  }

  function yOf(val: number): number {
    return PAD_Y + (1 - (val - minVal) / range) * (H - PAD_Y * 2);
  }

  function polyline(vals: number[]): string {
    return vals.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
  }

  // Band polygon: high line forward then low line backward
  const bandPoints = [
    ...series.map((p, i) => `${xOf(i)},${yOf(p.high)}`),
    ...[...series].reverse().map((p, i) => `${xOf(count - 1 - i)},${yOf(p.low)}`),
  ].join(" ");

  const midVals = series.map((p) => p.mid);
  const highVals = series.map((p) => p.high);
  const lowVals = series.map((p) => p.low);

  // Month labels at month 1, 3, 6, 9, 12
  const labelMonths = [1, 3, 6, 9, 12];

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 22}`}
      width="100%"
      height={H + 22}
      preserveAspectRatio="none"
      aria-label="12-month projected NAV range"
      role="img"
      className="block"
    >
      {/* Band fill */}
      <polygon
        points={bandPoints}
        fill="var(--ct-text-strong)"
        opacity="0.08"
      />

      {/* High line */}
      <polyline
        points={polyline(highVals)}
        fill="none"
        stroke="var(--ct-text-strong)"
        strokeWidth="1"
        strokeOpacity="0.35"
        strokeDasharray="4 3"
      />

      {/* Low line */}
      <polyline
        points={polyline(lowVals)}
        fill="none"
        stroke="var(--ct-text-strong)"
        strokeWidth="1"
        strokeOpacity="0.35"
        strokeDasharray="4 3"
      />

      {/* Mid line */}
      <polyline
        points={polyline(midVals)}
        fill="none"
        stroke="var(--ct-text-strong)"
        strokeWidth="2"
        strokeOpacity="0.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Month labels */}
      {labelMonths.map((m) => {
        const idx = m - 1;
        const p = series[idx];
        if (!p) return null;
        return (
          <text
            key={m}
            x={xOf(idx)}
            y={H + 16}
            textAnchor="middle"
            fontSize={CHART_LABEL_SIZE}
            fill="var(--ct-text-muted)"
            fontFamily="var(--font-sans)"
          >
            {`M${m}`}
          </text>
        );
      })}
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface NavSparklineProps {
  output: ScenarioOutput;
}

export function NavSparkline({ output }: NavSparklineProps) {
  const series = buildNavSeries(output.apy_range.low, output.apy_range.high);
  const last = series[series.length - 1];

  return (
    <Card>
      <CardHeader className="mb-3">
        <CardTitle>12-Month NAV Projection</CardTitle>
        <ProvenanceBadge kind="estimated" />
      </CardHeader>

      <div className="mb-3 flex flex-wrap items-end gap-6 text-sm">
        <div className="flex flex-col gap-0.5">
          <span className="stat-label text-micro">Low band</span>
          <span className="mono font-bold text-[--ct-text-body]">
            {last ? formatUsd(last.low) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="stat-label text-micro">Midpoint</span>
          <span className="mono font-bold text-[--ct-text-strong]">
            {last ? formatUsd(last.mid) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="stat-label text-micro">High band</span>
          <span className="mono font-bold text-[--ct-text-body]">
            {last ? formatUsd(last.high) : "—"}
          </span>
        </div>
        <div className="ml-auto text-micro text-[--ct-text-muted]">
          Notional $1M · 12 months
        </div>
      </div>

      <Sparkline series={series} />

      <div className="mt-3 flex items-center gap-4 text-micro text-[--ct-text-muted]">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-[--ct-text-strong] opacity-85"
          />
          Midpoint
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 rounded-full bg-[--ct-text-strong] opacity-35 border-t border-dashed border-[--ct-text-strong]"
          />
          Low / High range
        </span>
      </div>
    </Card>
  );
}
