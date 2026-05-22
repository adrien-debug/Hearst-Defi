/*
 * Dashboard bento charts — pure, deterministic, token-only SVGs.
 *
 * Mirrors the style of `timeseries-section.tsx` (fixed viewBox, min/max
 * normalisation that never divides by zero, stroke = var(--ct-accent*)).
 * Every primitive is declared BEFORE the component that uses it so the RSC
 * bundler always has it in scope (no hoist-order ReferenceError).
 *
 * No I/O, no Date.now(), no Math.random — callers pass real DashboardData.
 */

import { allocationStrokeFor } from "@/lib/allocation-colors";

// ── AUM sparkline ───────────────────────────────────────────────────────────

const SPARK_W = 100;
const SPARK_H = 36;
const SPARK_PAD = 2;

interface AumSparklinePoint {
  date: string;
  aum_usdc: number;
}

/** Map values onto evenly-spaced x and a normalised y inside the viewBox. */
function sparkPoints(
  values: number[],
): Array<{ x: number; y: number }> {
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerH = SPARK_H - SPARK_PAD * 2;
  return values.map((v, i) => ({
    x: n === 1 ? SPARK_W / 2 : (i / (n - 1)) * SPARK_W,
    y: SPARK_PAD + innerH - ((v - min) / span) * innerH,
  }));
}

function pointsToStr(pts: Array<{ x: number; y: number }>): string {
  return pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

interface AumSparklineProps {
  points: AumSparklinePoint[];
  ariaLabel: string;
}

export function AumSparkline({ points, ariaLabel }: AumSparklineProps) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.aum_usdc);
  const pts = sparkPoints(values);
  const line = pointsToStr(pts);
  const area = `${line} ${SPARK_W},${SPARK_H} 0,${SPARK_H}`;
  return (
    <svg
      className="dash-sparkline"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <polygon className="spark-fill" points={area} />
      <polyline className="spark-path" points={line} />
    </svg>
  );
}

// ── APY half-circle gauge ─────────────────────────────────────────────────────
// Reuses the .gauge-svg / .gauge-svg-circle pattern (r = 15.9155 → C = 100).
// Smile ∪ arc: visible bottom half is dasharray "50 50". The highlighted band
// marks where [low, high] sits inside [0, maxAxis]. Path runs right→bottom→left
// so axis value v maps to arc position (1 - v/maxAxis) * 50 from the start.

interface ApyGaugeProps {
  low: number;
  high: number;
  maxAxis: number;
  ariaLabel: string;
}

export function ApyGauge({ low, high, maxAxis, ariaLabel }: ApyGaugeProps) {
  const axis = maxAxis || 1;
  const clamp = (v: number) => Math.min(Math.max(v, 0), axis);
  const lo = clamp(low);
  const hi = clamp(Math.max(high, low));
  // With rotate(-90) on the group, arc starts at 9 o'clock (left = 0%).
  // pos maps axis value to dashoffset position: 0 → left, 50 → right.
  const posLo = (lo / axis) * 50;
  const posHi = (hi / axis) * 50;
  const bandLen = Math.max(posHi - posLo, 0.5);
  const bandDash = `${bandLen.toFixed(2)} ${(100 - bandLen).toFixed(2)}`;
  const bandOffset = -posLo;
  // viewBox crops to the bottom half only (y=16..42 with 2px padding for stroke overflow).
  // rotate(90) on the group shifts arc start to 9 o'clock so low→high reads left→right.
  return (
    <svg
      className="gauge-svg"
      viewBox="0 16 42 26"
      width="160"
      height="100"
      role="img"
      aria-label={ariaLabel}
    >
      <g transform="rotate(-90 21 21)">
        <circle
          className="gauge-svg-circle bg"
          cx="21"
          cy="21"
          r="15.9155"
          strokeWidth="6"
          strokeDasharray="50 50"
        />
        <circle
          className="gauge-svg-circle fg"
          cx="21"
          cy="21"
          r="15.9155"
          strokeWidth="6"
          strokeDasharray={bandDash}
          strokeDashoffset={bandOffset}
        />
      </g>
    </svg>
  );
}

// ── Allocation donut ──────────────────────────────────────────────────────────
// Reuses .dash-chart-svg / .dash-chart-circle (r = 15.9155 → C = 100, so pct
// maps 1:1 to dasharray length). Strokes come from ALLOCATION_STROKE via
// allocationStrokeFor(bucket) — token-only, no hardcoded colour.

interface DonutSegment {
  bucket: string;
  pct: number;
  dashArray: string;
  dashOffset: number;
}

interface AllocationDonutProps {
  segments: DonutSegment[];
  ariaLabel: string;
}

export function AllocationDonut({ segments, ariaLabel }: AllocationDonutProps) {
  return (
    <svg
      className="dash-chart-svg"
      viewBox="0 0 42 42"
      width="100%"
      height="100%"
      role="img"
      aria-label={ariaLabel}
    >
      <circle
        className="dash-chart-circle color-soft"
        cx="21"
        cy="21"
        r="15.9155"
        strokeDasharray="100 0"
        opacity="0.35"
      />
      {segments.map((s) => (
        <circle
          key={s.bucket}
          className="dash-chart-circle"
          cx="21"
          cy="21"
          r="15.9155"
          stroke={allocationStrokeFor(s.bucket)}
          strokeDasharray={s.dashArray}
          strokeDashoffset={s.dashOffset}
        />
      ))}
    </svg>
  );
}
