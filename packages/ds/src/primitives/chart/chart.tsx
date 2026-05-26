"use client";

/**
 * @ds/core/primitives/chart
 *
 * Native-SVG charts. No `recharts`, no `d3`. Five flavors:
 *   - LineChart, AreaChart, BarChart, DonutChart, SparklineChart
 *
 * All token-driven (palette via `--ds-chart-1..12`).
 */

import {
  forwardRef,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
import type {
  ForwardedRef,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

import { cn } from "../../utils/cn";

import {
  CHART_PALETTE,
  chartVariants,
  pickColor,
} from "./chart.variants";
import type {
  AreaChartProps,
  BarChartProps,
  ChartCommonProps,
  ChartSeries,
  DonutChartProps,
  LineChartProps,
  SparklineChartProps,
} from "./chart.types";

const DEFAULT_W = 480;
const DEFAULT_H = 240;
const DEFAULT_PAD = 24;

interface AxisExtent {
  min: number;
  max: number;
}

function extentOf(values: readonly number[]): AxisExtent {
  if (values.length === 0) return { min: 0, max: 1 };
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }
  return { min, max };
}

function gridTickCount(): number {
  return 4;
}

interface ChartFrameProps extends ChartCommonProps {
  children: ReactNode;
  legend?: ReactNode;
  /** Optional tooltip element absolutely positioned by caller. */
  tooltipNode?: ReactNode;
}

const ChartFrame = forwardRef<HTMLDivElement, ChartFrameProps>(
  function ChartFrame(
    {
      width = DEFAULT_W,
      height = DEFAULT_H,
      a11yLabel,
      className,
      children,
      legend,
      tooltipNode,
      ...rest
    },
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = chartVariants();
    return (
      <div ref={ref} className={cn(styles.root(), className)} {...rest}>
        <svg
          role="img"
          aria-label={a11yLabel ?? "Chart"}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className={styles.svg()}
        >
          {children}
        </svg>
        {tooltipNode}
        {legend ? <div className={styles.legend()}>{legend}</div> : null}
      </div>
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  LineChart                                                                  */
/* -------------------------------------------------------------------------- */

interface XY {
  x: number;
  y: number;
}

function buildLinePath(points: readonly XY[]): string {
  if (points.length === 0) return "";
  let d = `M${points[0]!.x.toFixed(2)},${points[0]!.y.toFixed(2)}`;
  for (let i = 1; i < points.length; i += 1) {
    d += ` L${points[i]!.x.toFixed(2)},${points[i]!.y.toFixed(2)}`;
  }
  return d;
}

interface SeriesPoints<TDatum> {
  series: ChartSeries<TDatum>;
  points: XY[];
  color: string;
}

interface Scales {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  innerW: number;
  innerH: number;
  pad: number;
  toX: (x: number) => number;
  toY: (y: number) => number;
}

function makeScales(
  width: number,
  height: number,
  pad: number,
  xExt: AxisExtent,
  yExt: AxisExtent,
): Scales {
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const xSpan = xExt.max - xExt.min || 1;
  const ySpan = yExt.max - yExt.min || 1;
  return {
    xMin: xExt.min,
    xMax: xExt.max,
    yMin: yExt.min,
    yMax: yExt.max,
    innerW,
    innerH,
    pad,
    toX: (x: number) => pad + ((x - xExt.min) / xSpan) * innerW,
    toY: (y: number) => pad + innerH - ((y - yExt.min) / ySpan) * innerH,
  };
}

function GridLines({
  scales,
  show,
}: {
  scales: Scales;
  show: boolean;
}): JSX.Element | null {
  if (!show) return null;
  const styles = chartVariants();
  const ticks = gridTickCount();
  const lines: ReactNode[] = [];
  for (let i = 0; i <= ticks; i += 1) {
    const y = scales.pad + (scales.innerH * i) / ticks;
    lines.push(
      <line
        key={`h${i}`}
        x1={scales.pad}
        x2={scales.pad + scales.innerW}
        y1={y}
        y2={y}
        strokeWidth={1}
        className={styles.grid()}
        opacity={0.4}
      />,
    );
  }
  return <g aria-hidden="true">{lines}</g>;
}

export function LineChart<TDatum extends Record<string, unknown>>({
  series,
  xKey,
  yKey,
  width = DEFAULT_W,
  height = DEFAULT_H,
  padding = DEFAULT_PAD,
  colors,
  gridlines = true,
  tooltip = true,
  a11yLabel,
  ...rest
}: LineChartProps<TDatum>): JSX.Element {
  const palette = colors ?? CHART_PALETTE;
  const styles = chartVariants();

  const enriched: SeriesPoints<TDatum>[] = useMemo(() => {
    return series.map((s, i) => {
      const color = s.color ?? pickColor(i, palette);
      const numericPoints: XY[] = s.data.map((d) => ({
        x: Number(d[xKey]),
        y: Number(d[yKey]),
      }));
      return { series: s, points: numericPoints, color };
    });
  }, [series, xKey, yKey, palette]);

  const xExt = useMemo(
    () => extentOf(enriched.flatMap((s) => s.points.map((p) => p.x))),
    [enriched],
  );
  const yExt = useMemo(
    () => extentOf(enriched.flatMap((s) => s.points.map((p) => p.y))),
    [enriched],
  );
  const scales = useMemo(
    () => makeScales(width, height, padding, xExt, yExt),
    [width, height, padding, xExt, yExt],
  );

  const [hover, setHover] = useState<
    | {
        seriesId: string;
        x: number;
        y: number;
        screenX: number;
        screenY: number;
      }
    | null
  >(null);

  const onMove = useCallback(
    (e: ReactMouseEvent<SVGSVGElement>) => {
      if (!tooltip) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mx =
        ((e.clientX - rect.left) / rect.width) * width;
      // Find nearest point across all series.
      let best:
        | {
            seriesId: string;
            x: number;
            y: number;
            screenX: number;
            screenY: number;
          }
        | null = null;
      let bestDist = Infinity;
      for (const s of enriched) {
        for (const p of s.points) {
          const sx = scales.toX(p.x);
          const dist = Math.abs(sx - mx);
          if (dist < bestDist) {
            bestDist = dist;
            best = {
              seriesId: s.series.id,
              x: p.x,
              y: p.y,
              screenX: sx,
              screenY: scales.toY(p.y),
            };
          }
        }
      }
      setHover(best);
    },
    [enriched, scales, tooltip, width],
  );

  const onLeave = useCallback(() => setHover(null), []);

  const legend = enriched.map((s, i) => (
    <span key={s.series.id} className={styles.legendItem()}>
      <span
        className={styles.legendSwatch()}
        style={{ background: s.color }}
        aria-hidden="true"
      />
      {s.series.label ?? s.series.id}
    </span>
  ));

  const tooltipNode =
    hover && tooltip ? (
      <div
        className={styles.tooltip()}
        style={{
          left: `${(hover.screenX / width) * 100}%`,
          top: `${(hover.screenY / height) * 100}%`,
        }}
      >
        <span className="font-[var(--ds-font-weight-body-md,600)]">
          {hover.seriesId}
        </span>
        <span className="mx-[var(--ds-spacing-1)]">·</span>
        <span className="tabular-nums">
          {hover.x.toLocaleString()}, {hover.y.toLocaleString()}
        </span>
      </div>
    ) : null;

  return (
    <ChartFrame
      width={width}
      height={height}
      a11yLabel={a11yLabel ?? "Line chart"}
      legend={legend}
      tooltipNode={tooltipNode}
      {...rest}
    >
      <g
        onMouseMove={onMove as unknown as React.MouseEventHandler<SVGGElement>}
        onMouseLeave={onLeave}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
        />
        <GridLines scales={scales} show={gridlines} />
        {enriched.map((s) => (
          <path
            key={s.series.id}
            d={buildLinePath(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {hover ? (
          <line
            x1={hover.screenX}
            x2={hover.screenX}
            y1={padding}
            y2={height - padding}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
            className="text-[color:var(--ds-text-secondary)]"
          />
        ) : null}
        {hover ? (
          <circle
            cx={hover.screenX}
            cy={hover.screenY}
            r={3}
            fill="currentColor"
            className="text-[color:var(--ds-text-primary)]"
          />
        ) : null}
      </g>
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  AreaChart                                                                  */
/* -------------------------------------------------------------------------- */

export function AreaChart<TDatum extends Record<string, unknown>>({
  series,
  xKey,
  yKey,
  width = DEFAULT_W,
  height = DEFAULT_H,
  padding = DEFAULT_PAD,
  colors,
  gridlines = true,
  fillOpacity = 0.18,
  a11yLabel,
  tooltip: _tooltip = true,
  ...rest
}: AreaChartProps<TDatum>): JSX.Element {
  const palette = colors ?? CHART_PALETTE;
  const styles = chartVariants();
  const enriched = series.map((s, i) => {
    const color = s.color ?? pickColor(i, palette);
    const points: XY[] = s.data.map((d) => ({
      x: Number(d[xKey]),
      y: Number(d[yKey]),
    }));
    return { series: s, points, color };
  });

  const xExt = extentOf(enriched.flatMap((s) => s.points.map((p) => p.x)));
  const yExt = extentOf(enriched.flatMap((s) => s.points.map((p) => p.y)));
  const scales = makeScales(width, height, padding, xExt, yExt);
  const gradId = useId();

  const legend = enriched.map((s) => (
    <span key={s.series.id} className={styles.legendItem()}>
      <span
        className={styles.legendSwatch()}
        style={{ background: s.color }}
        aria-hidden="true"
      />
      {s.series.label ?? s.series.id}
    </span>
  ));

  return (
    <ChartFrame
      width={width}
      height={height}
      a11yLabel={a11yLabel ?? "Area chart"}
      legend={legend}
      {...rest}
    >
      <defs>
        {enriched.map((s, i) => (
          <linearGradient
            key={s.series.id}
            id={`${gradId}-${i}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={s.color} stopOpacity={fillOpacity} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <GridLines scales={scales} show={gridlines} />
      {enriched.map((s, i) => {
        const projected = s.points.map((p) => ({
          x: scales.toX(p.x),
          y: scales.toY(p.y),
        }));
        const linePath = buildLinePath(projected);
        const first = projected[0];
        const last = projected[projected.length - 1];
        if (!first || !last) return null;
        const areaPath = `${linePath} L${last.x.toFixed(2)},${(height - padding).toFixed(
          2,
        )} L${first.x.toFixed(2)},${(height - padding).toFixed(2)} Z`;
        return (
          <g key={s.series.id}>
            <path d={areaPath} fill={`url(#${gradId}-${i})`} />
            <path
              d={linePath}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  BarChart                                                                   */
/* -------------------------------------------------------------------------- */

export function BarChart<TDatum extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  width = DEFAULT_W,
  height = DEFAULT_H,
  padding = DEFAULT_PAD,
  colors,
  gridlines = true,
  a11yLabel,
  tooltip: _tooltip = true,
  ...rest
}: BarChartProps<TDatum>): JSX.Element {
  const palette = colors ?? CHART_PALETTE;
  const styles = chartVariants();
  const ys = data.map((d) => Number(d[yKey]));
  const yExt = extentOf(ys);
  const yMin = Math.min(0, yExt.min);
  const yMax = yExt.max;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const barGap = 4;
  const barW = data.length > 0 ? Math.max(2, innerW / data.length - barGap) : 0;
  const ySpan = yMax - yMin || 1;
  const zeroY = padding + innerH - ((0 - yMin) / ySpan) * innerH;

  return (
    <ChartFrame
      width={width}
      height={height}
      a11yLabel={a11yLabel ?? "Bar chart"}
      {...rest}
    >
      {gridlines ? (
        <g aria-hidden="true">
          {Array.from({ length: gridTickCount() + 1 }, (_, i) => {
            const y = padding + (innerH * i) / gridTickCount();
            return (
              <line
                key={i}
                x1={padding}
                x2={padding + innerW}
                y1={y}
                y2={y}
                strokeWidth={1}
                opacity={0.4}
                className={styles.grid()}
              />
            );
          })}
        </g>
      ) : null}
      {data.map((d, i) => {
        const v = Number(d[yKey]);
        const xRaw = String(d[xKey]);
        const top = padding + innerH - ((Math.max(v, 0) - yMin) / ySpan) * innerH;
        const bottom =
          padding + innerH - ((Math.min(v, 0) - yMin) / ySpan) * innerH;
        const h = Math.max(1, bottom - top);
        const x = padding + i * (barW + barGap);
        const color = pickColor(i, palette);
        return (
          <g key={`${xRaw}-${i}`}>
            <rect
              x={x}
              y={Math.min(top, zeroY)}
              width={barW}
              height={h}
              fill={color}
              rx={2}
            >
              <title>{`${xRaw}: ${v}`}</title>
            </rect>
          </g>
        );
      })}
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  DonutChart                                                                 */
/* -------------------------------------------------------------------------- */

function polar(cx: number, cy: number, r: number, angleRad: number): XY {
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startAngle: number,
  endAngle: number,
): string {
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  const a1 = polar(cx, cy, rOuter, startAngle);
  const a2 = polar(cx, cy, rOuter, endAngle);
  const b1 = polar(cx, cy, rInner, endAngle);
  const b2 = polar(cx, cy, rInner, startAngle);
  return [
    `M${a1.x.toFixed(2)},${a1.y.toFixed(2)}`,
    `A${rOuter},${rOuter} 0 ${largeArc} 1 ${a2.x.toFixed(2)},${a2.y.toFixed(2)}`,
    `L${b1.x.toFixed(2)},${b1.y.toFixed(2)}`,
    `A${rInner},${rInner} 0 ${largeArc} 0 ${b2.x.toFixed(2)},${b2.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  data,
  width = 240,
  height = 240,
  innerRadius = 0.55,
  colors,
  a11yLabel,
  ...rest
}: DonutChartProps): JSX.Element {
  const palette = colors ?? CHART_PALETTE;
  const styles = chartVariants();
  const total = data.reduce((acc, d) => acc + Math.max(0, d.value), 0) || 1;
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = Math.min(width, height) / 2 - 4;
  const rInner = rOuter * innerRadius;

  let startAngle = -Math.PI / 2;

  const legend = data.map((d, i) => (
    <span key={d.id} className={styles.legendItem()}>
      <span
        className={styles.legendSwatch()}
        style={{ background: pickColor(i, palette) }}
        aria-hidden="true"
      />
      {d.label ?? d.id}
      <span className="ml-[var(--ds-spacing-1)] tabular-nums text-[color:var(--ds-text-secondary)]">
        {((d.value / total) * 100).toFixed(1)}%
      </span>
    </span>
  ));

  return (
    <ChartFrame
      width={width}
      height={height}
      a11yLabel={a11yLabel ?? "Donut chart"}
      legend={legend}
      {...rest}
    >
      {data.map((d, i) => {
        const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
        const endAngle = startAngle + slice;
        const path = arcPath(cx, cy, rOuter, rInner, startAngle, endAngle);
        startAngle = endAngle;
        return (
          <path key={d.id} d={path} fill={pickColor(i, palette)}>
            <title>{`${d.label ?? d.id}: ${d.value}`}</title>
          </path>
        );
      })}
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------- */
/*  SparklineChart                                                             */
/* -------------------------------------------------------------------------- */

export function SparklineChart({
  data,
  width = 120,
  height = 32,
  padding = 2,
  trendColor = true,
  colors,
  a11yLabel,
  ...rest
}: SparklineChartProps): JSX.Element {
  const palette = colors ?? CHART_PALETTE;
  const ext = extentOf(data);
  const stepX = (width - padding * 2) / Math.max(1, data.length - 1);
  const points: XY[] = data.map((v, i) => ({
    x: padding + i * stepX,
    y:
      padding +
      (height - padding * 2) * (1 - (v - ext.min) / (ext.max - ext.min || 1)),
  }));
  const path = buildLinePath(points);
  const direction =
    !trendColor || data.length < 2
      ? "flat"
      : (data[data.length - 1] ?? 0) > (data[0] ?? 0)
        ? "up"
        : "down";
  const stroke =
    direction === "up"
      ? "var(--ds-status-success-fg,var(--ds-color-success-600))"
      : direction === "down"
        ? "var(--ds-status-danger-fg,var(--ds-color-danger-600))"
        : pickColor(0, palette);

  return (
    <ChartFrame
      width={width}
      height={height}
      a11yLabel={a11yLabel ?? "Sparkline"}
      {...rest}
    >
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </ChartFrame>
  );
}
