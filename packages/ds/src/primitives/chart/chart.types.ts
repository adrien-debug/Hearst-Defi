import type { HTMLAttributes } from "react";

export interface ChartCommonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  /** Total SVG width (px). Defaults to 480. */
  width?: number;
  /** Total SVG height (px). Defaults to 240. */
  height?: number;
  /** Inner padding in px. Defaults to 24. */
  padding?: number;
  /** Color palette overrides. Defaults to `--ds-chart-1..12`. */
  colors?: readonly string[];
  /** Render gridlines. Defaults to true. */
  gridlines?: boolean;
  /** Render hover tooltip + crosshair. Defaults to true. */
  tooltip?: boolean;
  /** Accessible label exposed to AT. */
  a11yLabel?: string;
}

export interface ChartSeries<TDatum> {
  /** Stable id used for the legend + colour selection. */
  id: string;
  /** Human label shown in tooltip + legend. */
  label?: string;
  /** Datums backing the series. */
  data: readonly TDatum[];
  /** Optional explicit colour (overrides palette). */
  color?: string;
}

export interface LineChartProps<TDatum extends Record<string, unknown>>
  extends ChartCommonProps {
  series: readonly ChartSeries<TDatum>[];
  xKey: keyof TDatum;
  yKey: keyof TDatum;
}

export interface AreaChartProps<TDatum extends Record<string, unknown>>
  extends ChartCommonProps {
  series: readonly ChartSeries<TDatum>[];
  xKey: keyof TDatum;
  yKey: keyof TDatum;
  /** Fill opacity (0..1). Defaults to 0.18. */
  fillOpacity?: number;
}

export interface BarChartProps<TDatum extends Record<string, unknown>>
  extends ChartCommonProps {
  /** Data points (categorical bars). */
  data: readonly TDatum[];
  xKey: keyof TDatum;
  yKey: keyof TDatum;
}

export interface DonutChartProps extends ChartCommonProps {
  data: readonly { id: string; label?: string; value: number }[];
  /** Donut hole radius ratio (0..1). Defaults to 0.55. */
  innerRadius?: number;
}

export interface SparklineChartProps extends ChartCommonProps {
  data: readonly number[];
  /** Stroke direction-coloured ('auto' uses last-vs-first). Default true. */
  trendColor?: boolean;
}
