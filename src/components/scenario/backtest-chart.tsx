import type { MonthlyPoint } from "@/lib/engine/types";

interface BacktestChartProps {
  series: MonthlyPoint[];
}

// 10px = --ct-text-micro (SVG cannot read CSS vars at runtime)
const CHART_LABEL_SIZE = 10;

/** Inline SVG bar chart — no external chart library. */
export function BacktestChart({ series }: BacktestChartProps) {
  if (series.length === 0) {
    return (
      <div
        role="status"
        className="flex min-h-[var(--ct-chart-empty-h)] items-center justify-center glass-panel-subtle border-dashed px-6 py-8 text-center text-xs text-[var(--ct-text-muted)]"
      >
        No backtest data available for this period.
      </div>
    );
  }

  const CHART_HEIGHT = 140;
  const BAR_GAP = 2;
  const LABEL_HEIGHT = 20;
  const SVG_HEIGHT = CHART_HEIGHT + LABEL_HEIGHT;

  const values = series.map((p) => p.valueUsdc);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const count = series.length;

  return (
    <svg
      viewBox={`0 0 ${count * 100} ${SVG_HEIGHT}`}
      preserveAspectRatio="none"
      width="100%"
      height={SVG_HEIGHT}
      aria-label="Monthly vault value chart"
      role="img"
      className="block"
    >
      {series.map((point, i) => {
        const barWidth = 100 - BAR_GAP * 2;
        const x = i * 100 + BAR_GAP;

        // Normalise 0..1 where 1 = max value
        const normalised = (point.valueUsdc - minVal) / range;
        // Minimum bar height 4px so zero-value months are still visible
        const barHeight = Math.max(4, normalised * CHART_HEIGHT);
        const y = CHART_HEIGHT - barHeight;

        // Opacity from 0.35 (min) to 1 (max) based on relative value
        const opacity = 0.35 + normalised * 0.65;

        // Label: abbreviated month e.g. "Jan 24"
        const [year, mon] = point.month.split("-") as [string, string];
        const monthNames = [
          "Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ];
        const monthIndex = parseInt(mon, 10) - 1;
        const monthLabel = `${monthNames[monthIndex] ?? mon} ${year.slice(2)}`;

        return (
          <g key={point.month}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              ry={2}
              fill="var(--ct-text-strong)"
              opacity={opacity}
            >
              <title>
                {point.month}: ${point.valueUsdc.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </title>
            </rect>
            {/* Only show every other label when there are many months */}
            {(count <= 12 || i % 2 === 0) && (
              <text
                x={i * 100 + 50}
                y={CHART_HEIGHT + 15}
                textAnchor="middle"
                fontSize={CHART_LABEL_SIZE}
                fill="var(--ct-text-muted)"
                fontFamily="var(--font-sans)"
              >
                {monthLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
