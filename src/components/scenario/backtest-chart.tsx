import type { MonthlyPoint } from "@/lib/engine/types";

interface BacktestChartProps {
  series: MonthlyPoint[];
}

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

  return (
    <div className="h-20 w-full ct-empty-state">Chart placeholder</div>
  );
}
