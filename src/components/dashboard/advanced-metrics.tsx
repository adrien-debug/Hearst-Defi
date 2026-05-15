import { Metric } from "@/components/ui/metric";
import type { AdvancedMetricsData } from "@/lib/data/advanced-metrics";

interface AdvancedMetricsProps {
  data: AdvancedMetricsData;
}

// ---------------------------------------------------------------------------
// Renders the institutional risk ratios row. Pure render — every number on
// this surface was computed server-side by `src/lib/engine/ratios.ts`.
// ---------------------------------------------------------------------------

export function AdvancedMetrics({ data }: AdvancedMetricsProps) {
  if (!data.available) {
    return (
      <section aria-label="Advanced risk ratios">
        <p className="text-xs text-[--color-text-dim]">
          Need at least 6 months of NAV history to derive institutional risk
          ratios. Currently {data.monthsUsed}{" "}
          {data.monthsUsed === 1 ? "month" : "months"} available.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Advanced risk ratios"
      className="flex flex-col gap-3"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Metric
          label="Sharpe Ratio"
          value={formatRatio(data.sharpe)}
          provenance={data.provenance}
          tooltip="Excess return per unit of total volatility, annualised. Risk-free rate 4.5%. Higher is better; >1 is considered strong for institutional portfolios."
        />
        <Metric
          label="Sortino Ratio"
          value={formatRatio(data.sortino)}
          provenance={data.provenance}
          tooltip="Like Sharpe, but penalises only downside volatility. Target return 4.5%. Higher is better."
        />
        <Metric
          label="VaR (95%)"
          value={formatSignedPct(-data.varDecimal)}
          sublabel="monthly · historical sim"
          provenance={data.provenance}
          tooltip="Historical 95% Value-at-Risk: with 95% confidence, monthly loss does not exceed this. Negative by convention."
        />
        <Metric
          label="Max Drawdown"
          value={formatSignedPct(-data.maxDrawdownDecimal)}
          sublabel="peak-to-trough"
          provenance={data.provenance}
          tooltip="Worst peak-to-trough NAV decline observed across the loaded history. Negative by convention."
        />
        <Metric
          label="Calmar Ratio"
          value={
            data.calmarFinite ? formatRatio(data.calmar) : "n/a"
          }
          sublabel={data.calmarFinite ? "ann. return / |MDD|" : "no drawdown observed"}
          provenance={data.provenance}
          tooltip="Annualised return divided by the magnitude of max drawdown. Higher is better; >0.5 is considered acceptable, >1 is strong."
        />
      </div>
      <p className="text-xs text-[--color-text-dim]">
        Derived from {data.monthsUsed} months of NAV history. Not a guarantee of
        future performance.
      </p>
    </section>
  );
}

function formatRatio(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  const sign = n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

/**
 * Formats a signed decimal (e.g. -0.042) as "-4.2%" with a true minus sign.
 * Zero renders as "0.0%" with no sign.
 */
function formatSignedPct(decimal: number): string {
  const pct = decimal * 100;
  if (Math.abs(pct) < 0.05) return "0.0%";
  const sign = pct < 0 ? "−" : "+";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}
