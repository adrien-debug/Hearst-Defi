import { Eyebrow, Title, Sub, KpiGrid, KpiCard, Card } from "@hearst/cockpit-shell";
import { loadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice } from "@/lib/data/hashprice";
import { loadRiskFramework } from "@/lib/data/risk-framework";
import { loadAdvancedMetrics } from "@/lib/data/advanced-metrics";

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

function riskBand(score: number): string {
  if (score <= 33) return "Low";
  if (score <= 50) return "Low–Moderate";
  if (score <= 66) return "Moderate";
  if (score <= 80) return "Elevated";
  return "High";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
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
  const change24h = data.btcPrice.usd_24h_change;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {data.allocations.map((a) => (
            <div
              key={a.bucket}
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid var(--ct-border)",
                background: "var(--ct-surface-1)",
              }}
            >
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ct-text-secondary)" }}>
                {a.bucket === "mining" ? "Mining" : a.bucket === "usdc_base" ? "USDC Base" : a.bucket === "btc_tactical" ? "BTC Tactical" : "Stable Reserve"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ct-text-primary)", marginTop: 4 }}>
                {a.pct.toFixed(0)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--ct-text-secondary)", marginTop: 4 }}>
                {usdCompact.format(a.valueUsdc)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11, color: "var(--ct-text-secondary)" }}>
          Blended target: {blendedLow}% - {blendedHigh}%
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card title="BTC Tactical">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <MiniStat label="Position" value={`${btcSleevePct.toFixed(0)}%`} />
            <MiniStat label="BTC held" value={`${btcHeld.toFixed(2)}`} />
            <MiniStat label="Avg entry" value={usd0.format(avgEntry)} />
            <MiniStat label="Current" value={usd0.format(btcPriceUsd)} />
            <MiniStat label="P&L" value={`${pnlUsd >= 0 ? "+" : ""}${usdCompact.format(Math.abs(pnlUsd))}`} />
            <MiniStat label="P&L %" value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`} />
          </div>
        </Card>

        <Card title="Mining Health">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MiniStat label="Margin Score" value={`${data.vault.miningMarginScore}/100`} />
            <MiniStat label="Hashprice" value={`$${hashprice.usd_per_th_day.toFixed(3)}`} />
            <MiniStat label="Op Confidence" value={`${data.operationalConfidence}%`} />
            <MiniStat label="Hash Trend" value={`${data.hashpriceTrendPct >= 0 ? "+" : ""}${data.hashpriceTrendPct.toFixed(1)}%`} />
          </div>
        </Card>
      </div>

      <Card title="Risk Framework">
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ct-text-primary)" }}>
            Composite
          </span>
          <span style={{ fontSize: 28, fontWeight: 700, color: "var(--ct-accent)", fontVariantNumeric: "tabular-nums" }}>
            {riskFramework.composite}
          </span>
          <span style={{ fontSize: 12, color: "var(--ct-text-secondary)" }}>/ 100</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: 999,
              border: `1px solid var(--ct-accent)`,
              color: "var(--ct-accent)",
              marginLeft: "auto",
            }}
          >
            {riskFramework.bandLabel}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {riskFramework.dimensions.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid var(--ct-border)",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ct-text-primary)" }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--ct-text-secondary)" }}>
                  {d.detail}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ct-text-primary)" }}>
                  {d.score}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: 999,
                    border: `1px solid ${d.severity === "low" ? "var(--ct-success)" : d.severity === "medium" ? "var(--ct-warning)" : "var(--ct-danger)"}`,
                    color: d.severity === "low" ? "var(--ct-success)" : d.severity === "medium" ? "var(--ct-warning)" : "var(--ct-danger)",
                  }}
                >
                  {d.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Events">
        {data.recentEvents.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--ct-text-secondary)" }}>No recent events.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.recentEvents.slice(0, 5).map((e) => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--ct-border)",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ct-text-primary)" }}>
                    {e.ruleId}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ct-text-secondary)" }}>
                    {e.actionText}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: "var(--ct-text-secondary)", whiteSpace: "nowrap" }}>
                  {e.takenAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ textAlign: "center", fontSize: 10, color: "var(--ct-text-secondary)", paddingTop: 8 }}>
        Projections are conditional on the assumptions stated in Methodology v1.0.
        APY ranges are not guaranteed; past performance does not predict future returns.
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ct-text-secondary)" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "var(--ct-text-primary)", marginTop: 4 }}>
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
