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
//
// Supports two render modes:
//   1. Flat (1 ring) — when no segment has `positions` defined.
//   2. Hierarchical (2 rings) — when at least one segment provides `positions`.
//
// Ring geometry
//   Inner ring  r = 15.9155  C ≈ 100  (canonical; 1 pct unit = 1 dash unit)
//   Outer ring  r = 19.0986  C ≈ 120  (1.2× inner, same viewBox centre 21,21)
//
// Strokes are resolved from allocation-colors.ts (token-only, no hardcoded hex).
// Outer slices use the same stroke with opacity 0.6 (applied via fill-opacity /
// stroke-opacity on the circle element so the token value stays intact).
//
// Hover interaction: each inner slice is wrapped in a <g data-bucket="…"> and
// each outer slice in <g data-bucket-pos="…">. CSS in globals.css can target:
//   .alloc-inner:hover ~ .alloc-outer [data-bucket="mining"] { opacity: 1 }
// For MVP we handle highlight purely via data-bucket attributes + CSS siblings;
// no JS event handlers needed.

export type AllocationBucket =
  | "mining"
  | "btc_tactical"
  | "usdc_base"
  | "stable_reserve";

export interface AllocationPosition {
  label: string;
  pct: number;
  valueUsdc: number;
}

export interface AllocationSegment {
  bucket: AllocationBucket;
  pct: number;
  valueUsdc?: number;
  positions?: ReadonlyArray<AllocationPosition>;
}

// Legacy flat interface kept for backward compat — callers that still pass
// `DonutSegment[]` (with dashArray/dashOffset already computed) continue to
// work via the overloaded `AllocationDonutProps` below.
interface DonutSegment {
  bucket: string;
  pct: number;
  dashArray: string;
  dashOffset: number;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

const INNER_R = 15.9155; // C ≈ 100
const OUTER_R = 19.0986; // C ≈ 120  (ratio 1.2×)
const CX = 21;
const CY = 21;

// SVG donut trick: circumference = 2πr.
// Keeping dasharray in the "per-100" space means 1 % = 1 dasharray unit
// for the inner ring (C=100) and 1 % = 1.2 dasharray units for the outer.

const INNER_C = 2 * Math.PI * INNER_R; // ≈ 100
const OUTER_C = 2 * Math.PI * OUTER_R; // ≈ 120

/**
 * Convert a percentage (0-100) to SVG strokeDasharray/strokeDashoffset values
 * for a donut circle with circumference C.
 *
 * Rotation by -90° (applied to the group) means arc starts at 12 o'clock.
 * Offset accumulates around the circle; offset = -accumulatedPct * (C/100).
 */
function pctToInnerDash(
  pct: number,
  offset: number, // accumulated pct already consumed
): { dashArray: string; dashOffset: number } {
  const arc = (pct / 100) * INNER_C;
  const gap = INNER_C - arc;
  // Positive offset moves the dash start clockwise; negate for counter-clockwise.
  const dashOffset = -((offset / 100) * INNER_C);
  return {
    dashArray: `${arc.toFixed(4)} ${gap.toFixed(4)}`,
    dashOffset,
  };
}

function pctToOuterDash(
  pct: number,
  offset: number,
): { dashArray: string; dashOffset: number } {
  const arc = (pct / 100) * OUTER_C;
  const gap = OUTER_C - arc;
  const dashOffset = -((offset / 100) * OUTER_C);
  return {
    dashArray: `${arc.toFixed(4)} ${gap.toFixed(4)}`,
    dashOffset,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * AllocationDonutProps supports two call signatures:
 *
 *   1. Legacy flat:  { segments: DonutSegment[]; ariaLabel: string }
 *      segments have pre-computed dashArray/dashOffset.
 *
 *   2. Hierarchical: { segments: AllocationSegment[]; ariaLabel: string }
 *      segments carry `bucket`, `pct`, optional `positions`.
 *
 * Discriminated by presence of `dashArray` on the first segment element.
 */
interface AllocationDonutLegacyProps {
  segments: DonutSegment[];
  ariaLabel: string;
}

interface AllocationDonutHierarchicalProps {
  segments: AllocationSegment[];
  ariaLabel: string;
}

export type AllocationDonutProps =
  | AllocationDonutLegacyProps
  | AllocationDonutHierarchicalProps;

function isLegacySegments(
  segs: DonutSegment[] | AllocationSegment[],
): segs is DonutSegment[] {
  return segs.length > 0 && "dashArray" in segs[0]!;
}

function hasAnyPositions(segs: AllocationSegment[]): boolean {
  return segs.some((s) => s.positions !== undefined && s.positions.length > 0);
}

export function AllocationDonut({ segments, ariaLabel }: AllocationDonutProps) {
  // ── Legacy flat path (pre-computed dashArray/dashOffset) ──────────────────
  if (segments.length === 0 || isLegacySegments(segments)) {
    const legacySegs = segments as DonutSegment[];
    const bucketCount = legacySegs.length;
    return (
      <svg
        className="dash-chart-svg"
        viewBox="0 0 42 42"
        width="100%"
        height="100%"
        role="img"
        aria-label={ariaLabel}
      >
        <title>{`Allocation donut, ${bucketCount} bucket${bucketCount === 1 ? "" : "s"}`}</title>
        <circle
          className="dash-chart-circle color-soft"
          cx={CX}
          cy={CY}
          r={INNER_R}
          strokeDasharray="100 0"
          opacity="0.35"
        />
        {legacySegs.map((s) => (
          <circle
            key={s.bucket}
            className="dash-chart-circle"
            cx={CX}
            cy={CY}
            r={INNER_R}
            stroke={allocationStrokeFor(s.bucket)}
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
          />
        ))}
      </svg>
    );
  }

  // ── Hierarchical path ─────────────────────────────────────────────────────
  const hierSegs = segments as AllocationSegment[];
  const twoRings = hasAnyPositions(hierSegs);

  // Count total positions for aria label
  const positionCount = hierSegs.reduce(
    (acc, s) => acc + (s.positions?.length ?? 0),
    0,
  );

  // Build inner ring slices (pure reduce, no mutation)
  const innerSlices = hierSegs.reduce<
    Array<{
      bucket: AllocationBucket;
      pct: number;
      valueUsdc?: number;
      positions?: ReadonlyArray<AllocationPosition>;
      dashArray: string;
      dashOffset: number;
    }>
  >((acc, s) => {
    const runningOffset = acc.reduce((sum, item) => sum + item.pct, 0);
    const { dashArray, dashOffset } = pctToInnerDash(s.pct, runningOffset);
    return [...acc, { ...s, dashArray, dashOffset }];
  }, []);

  // Build outer ring slices (pure reduce, no mutation).
  // Each bucket contributes either its positions or a gap of bucket.pct so that
  // outer arcs stay angularly aligned with inner bucket slices.
  type OuterSlice = {
    bucket: AllocationBucket;
    label: string;
    pct: number;
    dashArray: string;
    dashOffset: number;
  };

  // Step 1: flatten buckets into (visible | gap) entries, preserving pct order.
  type OuterEntry =
    | { kind: "slice"; bucket: AllocationBucket; label: string; pct: number }
    | { kind: "gap"; pct: number };

  const outerEntries: OuterEntry[] = twoRings
    ? hierSegs.flatMap((s): OuterEntry[] => {
        if (s.positions && s.positions.length > 0) {
          return s.positions.map((pos) => ({
            kind: "slice" as const,
            bucket: s.bucket,
            label: pos.label,
            pct: pos.pct,
          }));
        }
        return [{ kind: "gap" as const, pct: s.pct }];
      })
    : [];

  // Step 2: accumulate offset + emit only visible slices.
  const outerSlices: OuterSlice[] = outerEntries
    .reduce<{ slices: OuterSlice[]; offset: number }>(
      ({ slices, offset }, entry) => {
        if (entry.kind === "gap") {
          return { slices, offset: offset + entry.pct };
        }
        const { dashArray, dashOffset } = pctToOuterDash(entry.pct, offset);
        return {
          slices: [
            ...slices,
            {
              bucket: entry.bucket,
              label: entry.label,
              pct: entry.pct,
              dashArray,
              dashOffset,
            },
          ],
          offset: offset + entry.pct,
        };
      },
      { slices: [], offset: 0 },
    )
    .slices;

  return (
    <svg
      className="dash-chart-svg alloc-donut"
      viewBox="0 0 42 42"
      width="100%"
      height="100%"
      role="img"
      aria-label={ariaLabel}
    >
      <title>
        {twoRings
          ? `Allocation donut, ${hierSegs.length} bucket${hierSegs.length === 1 ? "" : "s"}, ${positionCount} position${positionCount === 1 ? "" : "s"}`
          : `Allocation donut, ${hierSegs.length} bucket${hierSegs.length === 1 ? "" : "s"}`}
      </title>

      {/* Rotate entire content -90° so arc starts at 12 o'clock */}
      <g transform={`rotate(-90 ${CX} ${CY})`}>
        {/* ── Background track(s) ─────────────────────────────────────── */}
        <circle
          className="dash-chart-circle color-soft alloc-track-inner"
          cx={CX}
          cy={CY}
          r={INNER_R}
          strokeWidth="3"
          fill="none"
          stroke="var(--ct-surface-3)"
          opacity="0.35"
        />
        {twoRings && (
          <circle
            className="dash-chart-circle color-soft alloc-track-outer"
            cx={CX}
            cy={CY}
            r={OUTER_R}
            strokeWidth="2.5"
            fill="none"
            stroke="var(--ct-surface-3)"
            opacity="0.2"
          />
        )}

        {/* ── Inner ring — buckets ────────────────────────────────────── */}
        <g className="alloc-inner">
          {innerSlices.map((s) => (
            <circle
              key={s.bucket}
              className="dash-chart-circle alloc-inner-slice"
              data-bucket={s.bucket}
              cx={CX}
              cy={CY}
              r={INNER_R}
              strokeWidth="3"
              fill="none"
              stroke={allocationStrokeFor(s.bucket)}
              strokeDasharray={s.dashArray}
              strokeDashoffset={s.dashOffset}
            />
          ))}
        </g>

        {/* ── Outer ring — positions ──────────────────────────────────── */}
        {twoRings && (
          <g className="alloc-outer">
            {outerSlices.map((slice, i) => (
              <circle
                key={`${slice.bucket}-${slice.label}-${i}`}
                className="dash-chart-circle alloc-outer-slice"
                data-bucket={slice.bucket}
                data-label={slice.label}
                cx={CX}
                cy={CY}
                r={OUTER_R}
                strokeWidth="2.5"
                fill="none"
                stroke={allocationStrokeFor(slice.bucket)}
                strokeOpacity="0.6"
                strokeDasharray={slice.dashArray}
                strokeDashoffset={slice.dashOffset}
              />
            ))}
          </g>
        )}
      </g>
    </svg>
  );
}
