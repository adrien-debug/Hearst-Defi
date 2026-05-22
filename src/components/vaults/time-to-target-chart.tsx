"use client";

// TimeToTargetChart — SVG area chart projecting principal growth over time.
// Uses pure arithmetic helpers from src/lib/demo/projection.ts (no engine import
// in this Client Component to avoid any "server-only" leakage).
// Non-negotiable #5: no forbidden words in labels.
// Non-negotiable #10: "not guaranteed" disclaimer mandatory.
// Design lock: accent gradient via CSS vars only, no hex hardcoded.

import { useMemo } from "react";
import { buildProjectionSeries, monthsToTarget } from "@/lib/demo/projection";
import type { VaultProduct } from "@/lib/data/vaults";

interface TimeToTargetChartProps {
  amount: number; // USDC
  vault: VaultProduct;
}

const CHART_MONTHS = 24;
const TARGET_CUMULATIVE_PCT = 10; // 10% cumulative yield as "milestone"
const W = 560;
const H = 160;
const PAD = { top: 12, right: 16, bottom: 32, left: 56 };

export function TimeToTargetChart({ amount, vault }: TimeToTargetChartProps) {
  const series = useMemo(
    () => buildProjectionSeries(amount, vault.apyLow, vault.apyHigh, CHART_MONTHS),
    [amount, vault.apyLow, vault.apyHigh],
  );

  const midApy = (vault.apyLow + vault.apyHigh) / 2;
  const months10pct = monthsToTarget(midApy, TARGET_CUMULATIVE_PCT, CHART_MONTHS);

  // Chart bounds
  const allNavs = [...series.low, ...series.high].map((p) => p.nav);
  const navMin = Math.min(...allNavs);
  const navMax = Math.max(...allNavs);
  const navRange = navMax - navMin || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  function xOf(month: number) {
    return PAD.left + (month / CHART_MONTHS) * innerW;
  }
  function yOf(nav: number) {
    return PAD.top + innerH - ((nav - navMin) / navRange) * innerH;
  }

  function toPolyline(pts: { month: number; nav: number }[]) {
    return pts.map((p) => `${xOf(p.month)},${yOf(p.nav)}`).join(" ");
  }

  // Area path between low and high (shaded band)
  function areaPath(): string {
    const highPts = series.high;
    const lowPts = [...series.low].reverse();
    const top = highPts.map((p) => `${xOf(p.month)},${yOf(p.nav)}`).join(" L ");
    const bot = lowPts.map((p) => `${xOf(p.month)},${yOf(p.nav)}`).join(" L ");
    const x0 = xOf(0);
    return `M ${x0},${yOf(series.high[0]!.nav)} L ${top} L ${bot} Z`;
  }

  // Y-axis tick labels (3 ticks)
  const yTicks = [navMin, navMin + navRange / 2, navMax];

  const gradId = "ttc-area-grad";

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        aria-label="Projected NAV growth chart"
        role="img"
        className="w-full h-auto max-h-[160px]"
      >
        <defs>
          {/* Accent gradient — vars only, no hex */}
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ct-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--ct-accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((nav, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yOf(nav)}
              y2={yOf(nav)}
              stroke="var(--ct-border-soft)"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 6}
              y={yOf(nav) + 4}
              textAnchor="end"
              className="tabular fill-[var(--ct-text-faint)] text-[length:var(--ct-text-micro)]"
            >
              ${(nav / 1000).toFixed(0)}k
            </text>
          </g>
        ))}

        {/* X-axis labels: 0, 6, 12, 18, 24 */}
        {[0, 6, 12, 18, 24].map((m) => (
          <text
            key={m}
            x={xOf(m)}
            y={H - 6}
            textAnchor="middle"
            className="fill-[var(--ct-text-faint)] text-[length:var(--ct-text-micro)]"
          >
            m{m}
          </text>
        ))}

        {/* Shaded band */}
        <path d={areaPath()} fill={`url(#${gradId})`} />

        {/* High line */}
        <polyline
          points={toPolyline(series.high)}
          fill="none"
          stroke="var(--ct-accent)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Mid line */}
        <polyline
          points={toPolyline(series.mid)}
          fill="none"
          stroke="var(--ct-accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Low line */}
        <polyline
          points={toPolyline(series.low)}
          fill="none"
          stroke="var(--ct-accent)"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* 10% cumulative milestone marker */}
        {months10pct !== null && (
          <g>
            <line
              x1={xOf(months10pct)}
              x2={xOf(months10pct)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--ct-status-success)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <text
              x={xOf(months10pct) + 4}
              y={PAD.top + 12}
              className="fill-[var(--ct-status-success)] text-[length:var(--ct-text-micro)]"
            >
              +{TARGET_CUMULATIVE_PCT}% @m{months10pct}
            </text>
          </g>
        )}
      </svg>

      <p className="body-xs ct-text-faint text-center">
        Conditional projection — not a projection of future returns. Methodology v1.0.
      </p>
    </div>
  );
}
