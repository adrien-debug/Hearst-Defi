import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ApyRange } from "@/components/ui/apy-range";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type {
  ApyPoint,
  DashboardTimeseries,
  NavPoint,
} from "@/lib/data/dashboard";

// matches --ct-text-xs (Recharts ne lit pas les CSS vars runtime)
const CHART_LABEL_SIZE = 11;

const VIEWBOX_WIDTH = 600;
const CHART_HEIGHT = 140;
const PAD_TOP = 10;
const PAD_BOTTOM = 24;
const PLOT_HEIGHT = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

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
  const [y, m, d] = iso.split("-").map((s) => Number(s));
  if (!y || !m || !d) return iso;
  return monthDayFmt.format(new Date(Date.UTC(y, m - 1, d)));
}

interface TimeseriesSectionProps {
  data: DashboardTimeseries;
}

export function TimeseriesSection({ data }: TimeseriesSectionProps) {
  const provenance = data.source === "fallback" ? "estimated" : "live";
  return (
    <section
      aria-label="30-day trailing time-series"
      className="grid gap-8 lg:grid-cols-2"
    >
      <NavChart points={data.nav30d} provenance={provenance} />
      <ApyChart points={data.apy30d} provenance={provenance} />
    </section>
  );
}

interface NavChartProps {
  points: NavPoint[];
  provenance: import("@/components/ui/provenance-badge").Provenance;
}

function NavChart({ points, provenance }: NavChartProps) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.aum_usdc);
  const last = values[values.length - 1] ?? 0;
  const first = values[0] ?? 0;
  const deltaPct = first === 0 ? 0 : ((last - first) / first) * 100;

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
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>Net Asset Value</CardTitle>
          <p className="text-xs font-medium uppercase tracking-widest text-[--ct-text-muted]">
            Trailing 30 days · USDC
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums leading-tight text-[--ct-text-primary] drop-shadow-sm">
            {usdCompact.format(last)}
          </span>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "mono tabular-nums text-sm font-medium px-2 py-0.5 rounded-md backdrop-blur-md",
                trendDir === "up" && "ct-status-success-bg",
                trendDir === "down" && "ct-status-danger-bg",
                trendDir === "flat" && "ct-surface-1 ct-text-body ct-border-base",
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct.toFixed(1)}% (30d)
            </span>
            <ProvenanceBadge kind={provenance} />
          </div>
        </div>
      </CardHeader>

      {/* min-h-[8.75rem] conservé — 8.75rem = 140px, pas de step natif Tailwind (min-h-36=144px trop haut, min-h-32=128px trop bas) */}
      <div className="flex-1 min-h-[8.75rem] relative -mx-4 -mb-4 mt-4">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          role="img"
          aria-label={`AUM time-series from ${points[0]?.date ?? ""} to ${
            points[points.length - 1]?.date ?? ""
          }`}
          style={{ display: "block" }}
          className="absolute inset-0"
        >
          <defs>
            <linearGradient id="nav-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ct-surface-3)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path
            d={projection.areaPath}
            fill="url(#nav-gradient)"
          />
          <path
            d={projection.linePath}
            fill="none"
            stroke="var(--ct-text-primary)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#glow)"
          />
          {tickIndices.map((i) => {
            const x = projection.xs[i] ?? 0;
            const date = points[i]?.date ?? "";
            return (
              <text
                key={`tick-${i}`}
                x={x}
                y={CHART_HEIGHT - 6}
                textAnchor={
                  i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
                }
                fontSize={CHART_LABEL_SIZE}
                fill="var(--ct-text-faint)"
                fontFamily="var(--font-sans)"
                className="font-medium"
              >
                {formatTick(date)}
              </text>
            );
          })}
          {projection.xs.length > 0 ? (
            <g>
              <circle
                cx={projection.xs[projection.xs.length - 1]}
                cy={projection.ys[projection.ys.length - 1]}
                r={8}
                fill="var(--ct-surface-3)"
                className="animate-pulse"
              />
              <circle
                cx={projection.xs[projection.xs.length - 1]}
                cy={projection.ys[projection.ys.length - 1]}
                r={4}
                fill="currentColor"
                filter="url(#glow)"
              />
            </g>
          ) : null}
        </svg>
      </div>
    </Card>
  );
}

interface ApyChartProps {
  points: ApyPoint[];
  provenance: import("@/components/ui/provenance-badge").Provenance;
}

function ApyChart({ points, provenance }: ApyChartProps) {
  if (points.length === 0) return null;

  const lastPoint = points[points.length - 1];

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

  const bandPath = buildBandPath(highProj, lowProj);
  const targetY = mapY(METHODOLOGY_TARGET_APY, yMin, yMax);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex flex-col gap-2">
          <CardTitle>APY Range</CardTitle>
          <p className="text-xs font-medium uppercase tracking-widest text-[--ct-text-muted]">
            Trailing 30d · Target {METHODOLOGY_TARGET_APY.toFixed(0)}%
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {lastPoint ? (
            <ApyRange
              className="text-3xl leading-tight"
              low={lastPoint.apy_low}
              high={lastPoint.apy_high}
            />
          ) : null}
          <ProvenanceBadge kind={provenance} />
        </div>
      </CardHeader>

      {/* min-h-[8.75rem] conservé — 8.75rem = 140px, pas de step natif Tailwind (min-h-36=144px trop haut, min-h-32=128px trop bas) */}
      <div className="flex-1 min-h-[8.75rem] relative -mx-4 -mb-4 mt-4">
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          role="img"
          aria-label={`APY range time-series from ${points[0]?.date ?? ""} to ${
            points[points.length - 1]?.date ?? ""
          }`}
          style={{ display: "block" }}
          className="absolute inset-0"
        >
          <defs>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d={bandPath} fill="var(--ct-status-success-soft)" />
          <line
            x1={0}
            x2={VIEWBOX_WIDTH}
            y1={targetY}
            y2={targetY}
            stroke="var(--ct-text-faint)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={highProj.linePath}
            fill="none"
            stroke="var(--ct-status-success)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            filter="url(#glow-green)"
          />
          <path
            d={lowProj.linePath}
            fill="none"
            stroke="var(--ct-status-success-soft)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {tickIndices.map((i) => {
            const x = highProj.xs[i] ?? 0;
            const date = points[i]?.date ?? "";
            return (
              <text
                key={`tick-${i}`}
                x={x}
                y={CHART_HEIGHT - 6}
                textAnchor={
                  i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"
                }
                fontSize={CHART_LABEL_SIZE}
                fill="var(--ct-text-faint)"
                fontFamily="var(--font-sans)"
                className="font-medium"
              >
                {formatTick(date)}
              </text>
            );
          })}
        </svg>
      </div>
    </Card>
  );
}

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

function computeTickIndices(n: number): number[] {
  if (n <= 1) return [0];
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  const step = Math.max(1, Math.floor((n - 1) / 4));
  const out: number[] = [];
  for (let i = 0; i < n - 1; i += step) {
    out.push(i);
  }
  out.push(n - 1);
  return Array.from(new Set(out));
}
