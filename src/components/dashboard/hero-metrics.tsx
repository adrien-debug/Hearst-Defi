import { ApyRange } from "@/components/ui/apy-range";
import { Metric } from "@/components/ui/metric";
import type { BtcPriceData } from "@/lib/data/btc-price";
import type { DashboardSnapshot } from "@/lib/mock/dashboard";

interface HeroMetricsProps {
  snapshot: DashboardSnapshot;
  btcPrice: BtcPriceData;
}

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const usdShort = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 0,
});

const btcUsdFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function HeroMetrics({ snapshot, btcPrice }: HeroMetricsProps) {
  const delta30d = snapshot.aum.delta30dUsd;
  const aumTrendDirection: "up" | "down" | "flat" =
    delta30d > 0 ? "up" : delta30d < 0 ? "down" : "flat";

  const btcProvenance = btcPrice.stale || btcPrice.usd === 0 ? "stale" : "live";
  const btcValue =
    btcPrice.usd === 0 ? "Unavailable" : btcUsdFormat.format(btcPrice.usd);
  const change24h = btcPrice.usd_24h_change;
  const changeText =
    btcPrice.usd === 0
      ? undefined
      : `${change24h >= 0 ? "+" : ""}${change24h.toFixed(1)}% (24h)`;
  const changeTrend: "up" | "down" | "flat" =
    change24h > 0 ? "up" : change24h < 0 ? "down" : "flat";

  return (
    <section
      aria-label="Vault hero metrics"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      <Metric
        label="AUM"
        value={usdCompact.format(snapshot.aum.valueUsd)}
        provenance={snapshot.aum.provenance}
        trend={{
          direction: aumTrendDirection,
          text: `${delta30d >= 0 ? "+" : "−"}${usdShort.format(Math.abs(delta30d))} (30d)`,
        }}
        tooltip="Assets Under Management. Total USDC equivalent of all vault holdings, marked to market."
      />
      <Metric
        label="APY range"
        value={
          <ApyRange
            low={snapshot.currentApyRange.low}
            high={snapshot.currentApyRange.high}
          />
        }
        sublabel="forward 12m · conditional · not guaranteed"
        provenance={snapshot.apyProvenance}
        tooltip="Forward 12m projected APY range, calculated from current allocation × asset-class yield assumptions. Not guaranteed. Methodology v1.0."
      />
      <Metric
        label="Stressed APY"
        value={`${snapshot.stressedApy.toFixed(1)}%`}
        sublabel={snapshot.stressedScenarioLabel}
        provenance={snapshot.stressedProvenance}
        tooltip="Projected APY under combined Bear scenario (BTC −40%, hashprice −30%). Conditional projection."
      />
      <Metric
        label="Risk Score"
        value={`${snapshot.riskScore.value}/100`}
        sublabel={snapshot.riskScore.bandLabel}
        provenance={snapshot.riskScore.provenance}
        tooltip="Composite score (Market, Mining, Liquidity, Smart Contract, Counterparty). Lower = lower risk."
      />
      <Metric
        label="Next distribution"
        value={snapshot.nextDistribution.dateLabel}
        sublabel={`~${usdShort.format(snapshot.nextDistribution.estimateUsd)}`}
        provenance={snapshot.nextDistribution.provenance}
        tooltip="Next monthly USDC distribution. Estimate from current mining margin + base yield accrual."
      />
      <Metric
        label="BTC price"
        value={btcValue}
        provenance={btcProvenance}
        trend={
          changeText !== undefined
            ? { direction: changeTrend, text: changeText }
            : undefined
        }
        tooltip="Spot BTC/USD price from CoinGecko. Revalidated every 60 seconds. Stale badge shown if data is older than 5 minutes or unavailable."
      />
    </section>
  );
}
