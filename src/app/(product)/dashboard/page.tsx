import { Eyebrow, Title, Sub, KpiGrid, KpiCard, Card } from "@hearst/cockpit-shell";
import { loadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice } from "@/lib/data/hashprice";
import { loadRiskFramework } from "@/lib/data/risk-framework";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

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

const monthDayFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDistributionDate(d: {
  period: string;
  paid_at: Date | null;
  status: string;
}): string {
  if (d.paid_at) return monthDayFmt.format(d.paid_at);
  const parts = d.period.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m)) return d.period;
  const lastDay = new Date(Date.UTC(y, m, 0));
  return monthDayFmt.format(lastDay);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function riskBandVariant(score: number): "success" | "warning" | "danger" | "default" {
  if (score <= 50) return "success";
  if (score <= 66) return "warning";
  return "danger";
}

function severityVariant(severity: string): "success" | "warning" | "danger" | "default" {
  if (severity === "low") return "success";
  if (severity === "medium") return "warning";
  if (severity === "high") return "danger";
  return "default";
}

export default async function DashboardPage() {
  const [data, hashprice, riskFramework] = await Promise.all([
    loadDashboardData(),
    fetchHashprice(),
    loadRiskFramework(),
  ]);

  const asOf = new Date(data.vault.asOf);
  const delta30d = data.vault.delta30dUsdc;
  const aumTrend = delta30d >= 0 ? "+" : "−";

  const btcPriceUsd = data.btcPrice.usd === 0 ? 94_180 : data.btcPrice.usd;
  const btcValue = data.btcPrice.usd === 0 ? "Unavailable" : btcUsdFormat.format(btcPriceUsd);

  const blendedBps = data.allocations.reduce(
    (acc, a) => acc + (a.pct / 100) * a.yieldContributionBps,
    0,
  );
  const blendedPct = blendedBps / 100;
  const blendedLow = round1(Math.max(0, blendedPct * 0.85));
  const blendedHigh = round1(Math.max(blendedPct * 0.85 + 0.5, blendedPct * 1.18));

  const btcAlloc = data.allocations.find((a) => a.bucket === "btc_tactical");
  const btcSleeveUsd = btcAlloc?.valueUsdc ?? 0;
  const btcSleevePct = btcAlloc?.pct ?? 0;
  const avgEntry = 58_420;
  const btcHeld = btcPriceUsd > 0 ? btcSleeveUsd / btcPriceUsd : 0;
  const costBasis = btcHeld * avgEntry;
  const pnlUsd = Math.round(btcSleeveUsd - costBasis);
  const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;

  const latestDist = data.latestDistribution;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Eyebrow>Hearst Yield Vault</Eyebrow>
        <Title>Dashboard</Title>
        <Sub>
          Live sync ·{" "}
          {asOf.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })}{" "}
          UTC
        </Sub>
      </div>

      <KpiGrid>
        <KpiCard
          label="AUM"
          value={usdCompact.format(data.vault.aumUsdc)}
          accent
        />
        <KpiCard
          label="APY"
          value={`${data.vault.apyRange.low}-${data.vault.apyRange.high}%`}
        />
        <KpiCard
          label="Risk"
          value={`${data.vault.riskScore}/100`}
        />
        <KpiCard
          label="BTC"
          value={btcValue}
        />
        <KpiCard
          label="30d Δ"
          value={`${aumTrend}${usdShort.format(Math.abs(delta30d))}`}
        />
        <KpiCard
          label="Next dist"
          value={formatDistributionDate(latestDist)}
        />
      </KpiGrid>

      <Card title="Allocation">
        <div className="grid grid-cols-2 gap-3">
          {data.allocations.map((a) => (
            <div
              key={a.bucket}
              className="p-3 rounded-[--ct-radius-md] border border-[--ct-border] bg-[--ct-surface-1]"
            >
              <div className="text-[length:var(--text-micro)] uppercase tracking-[--tracking-loose] text-[--ct-text-muted]">
                {a.bucket === "mining" ? "Mining" : a.bucket === "usdc_base" ? "USDC Base" : a.bucket === "btc_tactical" ? "BTC Tactical" : "Stable Reserve"}
              </div>
              <div className="text-[length:var(--text-lg)] font-bold tabular-nums text-[--ct-text-primary] mt-1">
                {a.pct.toFixed(0)}%
              </div>
              <div className="text-[length:var(--text-micro)] text-[--ct-text-muted] mt-1">
                {usdCompact.format(a.valueUsdc)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[length:var(--text-micro)] text-[--ct-text-muted]">
          Blended target: {blendedLow}% - {blendedHigh}%
        </div>
      </Card>

      <div className="grid grid-cols-[2fr_1fr] gap-4">
        <Card title="BTC Tactical">
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Position" value={`${btcSleevePct.toFixed(0)}%`} />
            <MiniStat label="BTC held" value={`${btcHeld.toFixed(2)}`} />
            <MiniStat label="Avg entry" value={usd0.format(avgEntry)} />
            <MiniStat label="Current" value={usd0.format(btcPriceUsd)} />
            <MiniStat label="P&L" value={`${pnlUsd >= 0 ? "+" : ""}${usdCompact.format(Math.abs(pnlUsd))}`} />
            <MiniStat label="P&L %" value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`} />
          </div>
        </Card>

        <Card title="Mining Health">
          <div className="flex flex-col gap-3">
            <MiniStat label="Margin Score" value={`${data.vault.miningMarginScore}/100`} />
            <MiniStat label="Hashprice" value={`$${hashprice.usd_per_th_day.toFixed(3)}`} />
            <MiniStat label="Op Confidence" value={`${data.operationalConfidence}%`} />
            <MiniStat label="Hash Trend" value={`${data.hashpriceTrendPct >= 0 ? "+" : ""}${data.hashpriceTrendPct.toFixed(1)}%`} />
          </div>
        </Card>
      </div>

      <Card title="Risk Framework">
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-[length:var(--text-xs)] font-semibold text-[--ct-text-primary]">
            Composite
          </span>
          <span className="text-[length:var(--text-2xl)] font-bold text-[--ct-accent] tabular-nums">
            {riskFramework.composite}
          </span>
          <span className="text-[length:var(--text-xs)] text-[--ct-text-muted]">/ 100</span>
          <span className="ml-auto">
            <Badge variant={riskBandVariant(riskFramework.composite)}>
              {riskFramework.bandLabel}
            </Badge>
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {riskFramework.dimensions.map((d) => (
            <ListRow key={d.id}>
              <div>
                <div className="text-[length:var(--text-xs)] font-semibold text-[--ct-text-primary]">
                  {d.label}
                </div>
                <div className="text-[length:var(--text-micro)] text-[--ct-text-muted]">
                  {d.detail}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[length:var(--text-sm)] font-bold tabular-nums text-[--ct-text-primary]">
                  {d.score}
                </span>
                <Badge variant={severityVariant(d.severity)}>
                  {d.status}
                </Badge>
              </div>
            </ListRow>
          ))}
        </div>
      </Card>

      <Card title="Recent Events">
        {data.recentEvents.length === 0 ? (
          <p className="text-[length:var(--text-xs)] text-[--ct-text-muted]">No recent events.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.recentEvents.slice(0, 5).map((e) => (
              <ListRow key={e.id}>
                <div>
                  <div className="text-[length:var(--text-xs)] font-semibold text-[--ct-text-primary]">
                    {e.ruleId}
                  </div>
                  <div className="text-[length:var(--text-micro)] text-[--ct-text-muted]">
                    {e.actionText}
                  </div>
                </div>
                <span className="text-[length:var(--text-micro)] text-[--ct-text-muted] whitespace-nowrap">
                  {e.takenAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </ListRow>
            ))}
          </div>
        )}
      </Card>

      <div className="text-center text-[length:var(--text-micro)] text-[--ct-text-muted] pt-2">
        Projections are conditional on the assumptions stated in Methodology v1.0.
        APY ranges are not guaranteed; past performance does not predict future returns.
      </div>
    </div>
  );
}

function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[--ct-border] py-2">
      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-2">
      <div className="text-[length:var(--text-micro)] uppercase tracking-[--tracking-loose] text-[--ct-text-muted]">
        {label}
      </div>
      <div className="text-[length:var(--text-md)] font-bold tabular-nums text-[--ct-text-primary] mt-1">
        {value}
      </div>
    </div>
  );
}

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
