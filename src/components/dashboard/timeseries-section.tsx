import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ApyRange } from "@/components/ui/apy-range";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type {
  ApyPoint,
  DashboardTimeseries,
  NavPoint,
} from "@/lib/data/dashboard";

// ---------------------------------------------------------------------------
// Shared chart geometry. Both mini-charts paint inside a 600x120 viewBox and
// stretch to 100% width via `preserveAspectRatio="none"`.
// ---------------------------------------------------------------------------

const VIEWBOX_WIDTH = 600;
const CHART_HEIGHT = 120;
const PAD_TOP = 8;
const PAD_BOTTOM = 18; // space for x-axis labels
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

/** Constant target line for the APY chart — methodology v1.0 midpoint. */
const METHODOLOGY_TARGET_APY = 12;

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatTick(iso: string): string {
  // `YYYY-MM-DD` -> "Apr 14". Treat the string as UTC midnight.
  const [y, m, d] = iso.split("-").map((s) => Number(s));
  if (!y || !m || !d) return iso;
  return monthDayFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

interface TimeseriesSectionProps {
  data: DashboardTimeseries;
}

export function TimeseriesSection({ data }: TimeseriesSectionProps) {
  return (
    <section
      aria-label="30-day trailing time-series"
      className="grid gap-6 lg:grid-cols-2"
    >
      <NavChart points={data.nav30d} />
      <ApyChart points={data.apy30d} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// NAV chart — single line, gradient fill, last-point dot.
// ---------------------------------------------------------------------------

interface NavChartProps {
  points: NavPoint[];
}

export function NavChart({ points }: NavChartProps) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.aum_usdc);
  const last = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const deltaPct = first === 0 ? 0 : ((last - first) / first) * 100;

  // Auto-scale with 5% padding so the line is not glued to the edges.
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.05);
  const padding = span * 0.05;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;

  const projection = projectPoints(values, yMin, yMax);
  const tickIndices = computeTickIndices(points.length);
  const trendDir: "up" | "down" | "flat" =
    deltaPct > 0.05 ? "up" : deltaPct < -0.05 ? "down" : "flat";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Net Asset Value</CardTitle>
          <p className="text-xs text-[--color-text-dim]">
            Trailing 30 days · USDC
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="stat-value tabular leading-tight">
            {usdCompact.format(last)}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "mono tabular text-xs",
                trendDir === "up" && "text-[--color-success]",
                trendDir === "down" && "text-[--color-danger]",
                trendDir === "flat" && "text-[--color-text-dim]",
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(1)}% (30d)
            </span>
            <ProvenanceBadge kind="live" />
          </div>
        </div>
      </CardHeader>

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`AUM time-series from ${points[0]?.date ?? ""} to ${
          points[points.length - 1]?.date ?? ""
        }`}
        style={{ display: "block" }}
      >
        {/* Filled area under the curve */}
        <path
          d={projection.areaPath}
          fill="rgba(var(--brand-accent-rgb), 0.10)"
        />
        {/* Main stroke */}
        <path
          d={projection.linePath}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* X-axis ticks */}
        {tickIndices.map((i) => {
          const x = projection.xs[i] ?? 0;
          const date = points[i]?.date ?? "";
          return (
            <text
              key={`tick-${i}`}
              x={x}
              y={CHART_HEIGHT - 4}
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              fontSize={10}
              fill="var(--color-text-dim)"
              fontFamily="var(--font-sans)"
            >
              {formatTick(date)}
            </text>
          );
        })}
        {/* Last-point dot with halo */}
        {projection.xs.length > 0 ? (
          <g>
            <circle
              cx={projection.xs[projection.xs.length - 1]}
              cy={projection.ys[projection.ys.length - 1]}
              r={6}
              fill="rgba(var(--brand-accent-rgb), 0.18)"
            />
            <circle
              cx={projection.xs[projection.xs.length - 1]}
              cy={projection.ys[projection.ys.length - 1]}
              r={3}
              fill="var(--color-brand)"
            />
          </g>
        ) : null}
      </svg>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// APY chart — twin lines (high + low), filled band, dashed target.
// ---------------------------------------------------------------------------

interface ApyChartProps {
  points: ApyPoint[];
}

export function ApyChart({ points }: ApyChartProps) {
  if (points.length === 0) return null;

  const lastPoint = points[points.length - 1];

  // Y range covers high + low plus the methodology target with 5% padding.
  const lows = points.map((p) => p.apy_low);
  const highs = points.map((p) => p.apy_high);
  const rawMin = Math.min(...lows, METHODOLOGY_TARGET_APY);
  const rawMax = Math.max(...highs, METHODOLOGY_TARGET_APY);
  const span = rawMax - rawMin || 1;
  const padding = span * 0.05;
  const yMin = rawMin - padding;
  const yMax = rawMax + padding;

  const highProj = projectPoints(highs, yMin, yMax);
  const lowProj = projectPoints(lows, yMin, yMax);
  const tickIndices = computeTickIndices(points.length);

  // Filled band path: high stroke top-to-right, low stroke right-to-left.
  const bandPath = buildBandPath(highProj, lowProj);

  // Target line y position.
  const targetY = mapY(METHODOLOGY_TARGET_APY, yMin, yMax);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>APY Range — Trailing 30d</CardTitle>
          <p className="text-xs text-[--color-text-dim]">
            Methodology target · {METHODOLOGY_TARGET_APY.toFixed(0)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {lastPoint ? (
            <ApyRange
              className="stat-value leading-tight"
              low={lastPoint.apy_low}
              high={lastPoint.apy_high}
            />
          ) : null}
          <ProvenanceBadge kind="live" />
        </div>
      </CardHeader>

      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        width="100%"
        height={CHART_HEIGHT}
        role="img"
        aria-label={`APY range time-series from ${points[0]?.date ?? ""} to ${
          points[points.length - 1]?.date ?? ""
        }`}
        style={{ display: "block" }}
      >
        {/* Filled band between high + low */}
        <path d={bandPath} fill="rgba(var(--brand-accent-rgb), 0.12)" />
        {/* Methodology target — dashed horizontal */}
        <line
          x1={0}
          x2={VIEWBOX_WIDTH}
          y1={targetY}
          y2={targetY}
          stroke="var(--color-text-dim)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
        {/* High line */}
        <path
          d={highProj.linePath}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* Low line */}
        <path
          d={lowProj.linePath}
          fill="none"
          stroke="rgba(var(--brand-accent-rgb), 0.55)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* X-axis ticks */}
        {tickIndices.map((i) => {
          const x = highProj.xs[i] ?? 0;
          const date = points[i]?.date ?? "";
          return (
            <text
              key={`tick-${i}`}
              x={x}
              y={CHART_HEIGHT - 4}
              textAnchor={
                i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
              }
              fontSize={10}
              fill="var(--color-text-dim)"
              fontFamily="var(--font-sans)"
            >
              {formatTick(date)}
            </text>
          );
        })}
      </svg>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Path / projection helpers
// ---------------------------------------------------------------------------

interface Projection {
  xs: number[];
  ys: number[];
  linePath: string;
  areaPath: string;
}

function mapY(value: number, yMin: number, yMax: number): number {
  const span = yMax - yMin || 1;
  const normalised = (value - yMin) / span;
  return PAD_TOP + (1 - normalised) * PLOT_HEIGHT;
}

function projectPoints(values: number[], yMin: number, yMax: number): Projection {
  const n = values.length;
  if (n === 0) {
    return { xs: [], ys: [], linePath: "", areaPath: "" };
  }
  const step = n === 1 ? 0 : VIEWBOX_WIDTH / (n - 1);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const v = values[i] ?? 0;
    xs.push(i * step);
    ys.push(mapY(v, yMin, yMax));
  }

  const linePath = xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${(ys[i] ?? 0).toFixed(2)}`)
    .join(" ");

  const baselineY = PAD_TOP + PLOT_HEIGHT;
  const areaPath =
    `M${xs[0]?.toFixed(2) ?? 0} ${baselineY.toFixed(2)} ` +
    xs
      .map((x, i) => `L${x.toFixed(2)} ${(ys[i] ?? 0).toFixed(2)}`)
      .join(" ") +
    ` L${(xs[xs.length - 1] ?? 0).toFixed(2)} ${baselineY.toFixed(2)} Z`;

  return { xs, ys, linePath, areaPath };
}

function buildBandPath(top: Projection, bottom: Projection): string {
  if (top.xs.length === 0 || bottom.xs.length === 0) return "";
  const downward = top.xs
    .map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${(top.ys[i] ?? 0).toFixed(2)}`)
    .join(" ");
  const upward = bottom.xs
    .slice()
    .reverse()
    .map((x, i) => {
      const idx = bottom.xs.length - 1 - i;
      const y = bottom.ys[idx] ?? 0;
      return `L${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  return `${downward} ${upward} Z`;
}

/**
 * Pick ~5 evenly-spaced x-axis ticks (every ~7 days for a 30-point series).
 * Always includes index 0 and the last index for context.
 */
function computeTickIndices(n: number): number[] {
  if (n <= 1) return [0];
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  const step = Math.max(1, Math.floor((n - 1) / 4));
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += step) {
    out.push(i);
  }
  out.push(n - 1);
  // Deduplicate when (n-1) collides with the last stepped index.
  return Array.from(new Set(out));
}
