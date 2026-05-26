import { Metric } from "@/components/ui/metric";
import { computeSharpe, computeSortino, computeVar95 } from "@/lib/engine/risk";
import { getVaultReturns } from "@/lib/portfolio/returns";

interface RiskMetricsPanelProps {
  /** Vault identifier. Passed through to `getVaultReturns` for future multi-vault support. */
  vaultId: string;
}

/**
 * Server Component — fetches the last 12 monthly returns for a vault and
 * renders Sharpe, Sortino, and 95% VaR metric cards using Cockpit design-system
 * primitives. Each card carries a ProvenanceBadge "Estimated" and a tooltip.
 *
 * Disclaimer (CLAUDE.md non-negotiable #10): "Risk metrics computed on
 * historical data. Past performance not guaranteed."
 */
export async function RiskMetricsPanel({ vaultId }: RiskMetricsPanelProps) {
  const data = await getVaultReturns(vaultId, "12m");
  const rets = data.returns.map((r) => r.returnDecimal);

  const sharpe = computeSharpe(rets);
  const sortino = computeSortino(rets);
  const var95 = computeVar95(rets);

  const hasData = rets.length >= 2;

  return (
    <section
      aria-label="Risk metrics panel"
      data-testid="risk-metrics-panel"
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Sharpe Ratio */}
        <Metric
          label="Sharpe Ratio"
          value={hasData ? sharpe.toFixed(2) : "—"}
          sublabel="Annualised · 12m"
          provenance="estimated"
          tooltip="What is Sharpe? The Sharpe ratio measures risk-adjusted return: (portfolio return − risk-free rate) ÷ volatility. Higher is better. Values above 1.0 indicate strong risk-adjusted performance."
        />

        {/* Sortino Ratio */}
        <Metric
          label="Sortino Ratio"
          value={hasData ? sortino.toFixed(2) : "—"}
          sublabel="Annualised · 12m"
          provenance="estimated"
          tooltip="What is Sortino? Like Sharpe, but penalises only downside volatility — negative deviations below the target return. A higher Sortino indicates better downside protection relative to upside."
        />

        {/* VaR 95% */}
        <Metric
          label="VaR 95% (1m)"
          value={hasData ? `${(var95 * 100).toFixed(2)}%` : "—"}
          sublabel="Historical simulation"
          provenance="estimated"
          tooltip="What is VaR 95%? Value-at-Risk at 95% confidence: the maximum monthly loss expected to be exceeded only 5% of the time, based on historical returns. A figure of 4% means a 5% chance of losing ≥ 4% in any given month."
        />
      </div>

      <p className="body-xs text-[var(--ct-text-muted)] italic mt-1">
        Risk metrics computed on historical data. Past performance not guaranteed.
      </p>
    </section>
  );
}
