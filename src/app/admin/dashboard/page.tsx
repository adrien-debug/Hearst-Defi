import "@/app/(product)/charts-shared.css";

import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ActivityFeed } from "@/components/admin/activity-feed";
import { AdvancedModeToggle } from "@/components/admin/advanced-mode-toggle";
import { BtcTacticalCard } from "@/components/admin/btc-tactical-card";
import { VaultSelector } from "@/components/admin/vault-selector";
import { AllocationDonut } from "@/components/dashboard/dashboard-charts";
import { MiningHealthSection } from "@/components/dashboard/mining-health";
import { RiskFrameworkSection } from "@/components/dashboard/risk-framework";
import { TimeseriesSection } from "@/components/dashboard/timeseries-section";
import { ApyRange } from "@/components/ui/apy-range";
import { Card } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { SkeletonCard } from "@/components/ui/skeleton";
import { requireAdmin } from "@/lib/auth/require-admin";
import { allocationLabelFor, allocationStrokeFor } from "@/lib/allocation-colors";
import { loadCustody } from "@/lib/data/custody";
import { loadAdvancedMetrics } from "@/lib/data/advanced-metrics";
import { loadDashboardData } from "@/lib/data/dashboard";
import { loadRiskFramework } from "@/lib/data/risk-framework";
import { listAllVaults } from "@/lib/vaults/resolver";
import { vaultSlug, vaultLabel } from "@/lib/vaults/slug";

export const dynamic = "force-dynamic";

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// ---------------------------------------------------------------------------
// Yield source breakdown — methodology v1.0 target contributions. Estimated
// when the live `yieldContributionBps` (already on `DashboardAllocation`) is
// zero or unavailable. Mirrors the four buckets in /docs/spec/01-dashboard.mdx.
// ---------------------------------------------------------------------------
const YIELD_SOURCE_TARGETS = [
  { bucket: "mining" as const, label: "Mining cashflow", target: "~6.2%" },
  { bucket: "usdc_base" as const, label: "USDC base yield", target: "~4.8%" },
  { bucket: "btc_tactical" as const, label: "BTC tactical P&L", target: "variable" },
  { bucket: "stable_reserve" as const, label: "Stable reserve", target: "~4.5%" },
];

interface DashboardPageProps {
  searchParams: Promise<{ mode?: string; vault?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const mode: "simple" | "advanced" =
    params.mode === "advanced" ? "advanced" : "simple";
  const requestedVault = params.vault;

  const [data, custody, risk, allVaultRefs] = await Promise.all([
    loadDashboardData(requestedVault),
    loadCustody(),
    loadRiskFramework(),
    listAllVaults({ status: "live-or-paused" }),
  ]);
  const { vault, vaultMeta } = data;

  // Selector catalog = 3 engine fixtures + every live/paused VaultDeployment
  // wired through the resolver. Surfaces wizard-created vaults in the rail
  // (resolves the schism between Prisma deployments and engine fixtures).
  const vaultOptions = allVaultRefs.map((ref) => ({
    id: vaultSlug(ref),
    label: vaultLabel(ref),
  }));

  // Donut segments — canonical SVG convention (C=100): dashArray = pct, offset
  // is the running cumulative so each arc starts where the previous ended.
  const allocSegments = data.allocations.map((a, i) => ({
    bucket: a.bucket,
    pct: a.pct,
    valueUsdc: a.valueUsdc,
    dashArray: `${a.pct} ${100 - a.pct}`,
    dashOffset: -data.allocations
      .slice(0, i)
      .reduce((sum, prev) => sum + prev.pct, 0),
  }));

  // Risk score band label — re-using the same compositeBand semantics surfaced
  // by `loadRiskFramework()` keeps the hero and the framework section aligned.
  const riskBandLabel = risk.bandLabel;

  // Next distribution: derive from latestDistribution.paid_at when available;
  // otherwise fall back to a "—" placeholder. We never fabricate a date.
  const nextDist = data.latestDistribution;
  const nextDistLabel =
    nextDist.paid_at !== null ? dateFmt.format(nextDist.paid_at) : "—";
  const nextDistAmount =
    nextDist.amount_usdc > 0
      ? `~${usdCompact.format(nextDist.amount_usdc)}`
      : nextDist.status;

  // 30d AUM delta sublabel for the AUM card.
  const aumSublabel =
    custody.configured
      ? "USDC reserves · Fireblocks"
      : vault.delta30dUsdc !== 0
        ? `${vault.delta30dUsdc >= 0 ? "+" : ""}${usdCompact.format(vault.delta30dUsdc)} (30d)`
        : "Fireblocks scope not pinned";

  // Vault APY range shown in the hero — ALWAYS from the engine preset for the
  // selected vault. ADR-006 #9: when live snapshots are not yet per-vault, we
  // surface the vault's OWN apy target instead of reusing the Yield snapshot's
  // numbers. For Yield itself the snapshot range and the engine range converge
  // once the seeded data is in sync.
  const headlineApy = vaultMeta.livePreview
    ? vaultMeta.apyTarget
    : vault.apyRange;

  return (
    <div className="space-y-10">
      <AdminPageHeader
        title="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <VaultSelector
              active={vaultMeta.id}
              options={vaultOptions}
              preserveParams={
                mode === "advanced" ? { mode: "advanced" } : undefined
              }
            />
            <AdvancedModeToggle active={mode} />
          </div>
        }
      />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="h3">{vaultMeta.name}</h2>
      </div>

      {/* Hero — live KPI grid for Yield, methodology-only fallback for the
          other vaults. ADR-006 #9: when no per-vault snapshot exists yet, the
          Yield AUM/Risk/Mining/Stressed numbers must NOT be reused under the
          other vaults' names — we surface the engine preset (APY range, next
          distribution) and a Card explaining the gap, rather than masking the
          mismatch behind discreet copy. */}
      <section aria-label="Vault overview">
        {vaultMeta.livePreview ? (
          <Card
            className="border-[var(--ct-status-warning-border)] bg-[var(--ct-status-warning-soft)]"
            aria-label={`${vaultMeta.name} live snapshot pending`}
          >
            <p className="eyebrow">Per-vault live snapshot pending</p>
            <p className="mt-2 body-sm ct-text-muted">
              {vaultMeta.name} live KPIs (AUM, risk score, mining margin,
              stressed APY) land with Phase 3 multi-vault DB schema. The numbers
              below are the {vaultMeta.name} methodology preset only — not the
              Hearst Yield Vault timeline relabelled. Allocation, Mining Health,
              BTC Tactical, Activity, Risk, and Time-series sections that
              follow still reflect Yield Vault live data and are shown as
              preview context only.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Metric
                label="APY range"
                provenance="estimated"
                value={
                  <ApyRange
                    low={headlineApy.low}
                    high={headlineApy.high}
                    precision={1}
                  />
                }
                sublabel={`${vaultMeta.name} · methodology preset`}
                tooltip={`Forward 12m projected APY range for ${vaultMeta.name}, sourced from its methodology preset (allocation targets × asset-class yield assumptions). Not guaranteed. Methodology v1.0.`}
              />
              <Metric
                label="Next distribution"
                provenance="estimated"
                value={<span className="tabular">{nextDistLabel}</span>}
                sublabel={nextDistAmount}
                tooltip="Next monthly USDC distribution. Estimate from current mining margin + base yield accrual. Cadence shared across vaults; per-vault amounts arrive with Phase 3."
              />
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Metric
              label="AUM"
              provenance={custody.provenance}
              value={usdCompact.format(
                custody.configured && custody.totalUsdcReserves > 0
                  ? custody.totalUsdcReserves
                  : vault.aumUsdc,
              )}
              sublabel={aumSublabel}
              tooltip="Assets Under Management. Total USDC equivalent of all vault holdings, marked to market."
            />
            <Metric
              label="APY range"
              provenance="estimated"
              value={
                <ApyRange
                  low={headlineApy.low}
                  high={headlineApy.high}
                  precision={1}
                />
              }
              sublabel="forward 12m · conditional"
              tooltip={`Forward 12m projected APY range for ${vaultMeta.name}, sourced from its methodology preset (allocation targets × asset-class yield assumptions). Not guaranteed. Methodology v1.0.`}
            />
            <Metric
              label="Stressed APY"
              provenance="estimated"
              value={
                <ApyRange
                  low={vault.stressedApyRange.low}
                  high={vault.stressedApyRange.high}
                  precision={1}
                />
              }
              sublabel="Bear + mining compression"
              tooltip="Projected APY under combined Bear scenario (BTC −40%, hashprice −30%). Conditional projection. Range = ±15% of the projection bear (méthodologie v1.0)."
            />
            <Metric
              label="Risk score"
              provenance="estimated"
              value={
                <span className="tabular">
                  {vault.riskScore}
                  <span className="text-[0.6em] font-medium opacity-80 ml-1 ct-text-faint">
                    /100
                  </span>
                </span>
              }
              sublabel={riskBandLabel}
              tooltip="Composite score (Market, Mining, Liquidity, Smart Contract, Counterparty). Lower = lower risk."
            />
            <Metric
              label="Next distribution"
              provenance="estimated"
              value={<span className="tabular">{nextDistLabel}</span>}
              sublabel={nextDistAmount}
              tooltip="Next monthly USDC distribution. Estimate from current mining margin + base yield accrual."
            />
          </div>
        )}
      </section>

      {/* Allocation */}
      <section aria-label="Allocation breakdown">
        <Card>
          <p className="eyebrow mb-4">Allocation breakdown</p>
          {allocSegments.length === 0 ? (
            <p className="body-sm ct-text-muted">No allocation data yet.</p>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[auto_1fr_1fr]">
              <div className="h-40 w-40 shrink-0">
                <AllocationDonut
                  segments={allocSegments}
                  ariaLabel="Allocation breakdown by bucket"
                />
              </div>
              <ul className="flex min-w-56 flex-col gap-2">
                {allocSegments.map((s) => (
                  <li
                    key={s.bucket}
                    className="flex items-center justify-between gap-3 body-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: allocationStrokeFor(s.bucket) }}
                      />
                      {allocationLabelFor(s.bucket)}
                    </span>
                    <span className="tabular ct-text-muted">
                      {s.pct.toFixed(0)}% · {usdCompact.format(s.valueUsdc)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex min-w-56 flex-col gap-2">
                <p className="mono text-[length:var(--ct-text-micro)] uppercase tracking-[var(--ct-tracking-wide)] ct-text-faint">
                  Yield sources
                </p>
                {YIELD_SOURCE_TARGETS.map((src) => {
                  const a = data.allocations.find((x) => x.bucket === src.bucket);
                  const contribPct =
                    a && a.yieldContributionBps > 0
                      ? `${(a.yieldContributionBps / 100).toFixed(2)}%`
                      : src.target;
                  return (
                    <div
                      key={src.bucket}
                      className="flex items-baseline justify-between gap-3 body-sm"
                    >
                      <span className="ct-text-body">{src.label}</span>
                      <span className="tabular ct-text-muted">
                        {contribPct}
                        <span className="ct-text-faint">
                          {" "}
                          · estimated contribution
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Mining health */}
      <section aria-label="Mining health">
        <Suspense fallback={<SkeletonCard />}>
          <MiningHealthSection
            miningHealth={{
              marginScore: vault.miningMarginScore,
              hashpriceTrendPct: data.hashpriceTrendPct,
              opConfidence: data.operationalConfidence,
              provenance: data.source === "db" ? "live" : "estimated",
            }}
            hashprice={
              data.miningOps.hashprice
                ? {
                    usd_per_th_day: data.miningOps.hashprice.usd_per_th_day,
                    stale: data.miningOps.hashprice.stale,
                  }
                : null
            }
          />
        </Suspense>
      </section>

      {/* BTC tactical + Activity (side-by-side on lg) */}
      <section
        aria-label="BTC tactical and activity"
        className="grid gap-8 lg:grid-cols-2"
      >
        <BtcTacticalCard data={data} />
        <ActivityFeed events={data.recentEvents} />
      </section>

      {/* Risk framework */}
      <section aria-label="Risk framework">
        <RiskFrameworkSection data={risk} />
      </section>

      {/* Timeseries */}
      <section aria-label="Trailing time-series">
        <Suspense
          fallback={
            <div className="grid gap-8 lg:grid-cols-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          }
        >
          <TimeseriesSection data={data.timeseries} />
        </Suspense>
      </section>

      {mode === "advanced" && !vaultMeta.livePreview ? (
        <Suspense
          fallback={
            <section aria-label="Advanced metrics">
              <SkeletonCard />
            </section>
          }
        >
          <AdvancedMetricsSection />
        </Suspense>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Advanced metrics — institutional ratios. Hidden behind ?mode=advanced.
// ---------------------------------------------------------------------------

async function AdvancedMetricsSection() {
  const m = await loadAdvancedMetrics();
  const provenance = m.provenance === "estimated" ? "estimated" : "partial";

  const pct1 = new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  return (
    <section aria-label="Advanced metrics" className="space-y-4">
      <p className="eyebrow">Advanced metrics</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Sharpe"
          provenance={provenance}
          value={
            <span className="tabular">
              {m.available ? m.sharpe.toFixed(2) : "—"}
            </span>
          }
          sublabel={m.available ? `${m.monthsUsed} months` : "Insufficient history"}
          tooltip="Sharpe ratio: excess return per unit of total volatility. Methodology v1.0."
        />
        <Metric
          label="Sortino"
          provenance={provenance}
          value={
            <span className="tabular">
              {m.available ? m.sortino.toFixed(2) : "—"}
            </span>
          }
          sublabel={m.available ? `${m.monthsUsed} months` : "Insufficient history"}
          tooltip="Sortino ratio: excess return per unit of downside volatility."
        />
        <Metric
          label="VaR 95%"
          provenance={provenance}
          value={
            <span className="tabular">
              {m.available ? pct1.format(m.varDecimal) : "—"}
            </span>
          }
          sublabel="Monthly, 95% confidence"
          tooltip="Value-at-Risk at 95% confidence over a one-month horizon."
        />
        <Metric
          label="Max drawdown"
          provenance={provenance}
          value={
            <span className="tabular">
              {m.available ? pct1.format(m.maxDrawdownDecimal) : "—"}
            </span>
          }
          sublabel="Peak-to-trough"
          tooltip="Largest peak-to-trough decline in the available NAV series."
        />
      </div>

      <Card>
        <p className="eyebrow mb-4">DeFi positions &amp; fee accrual</p>
        <ul className="flex flex-col">
          <DefiRow
            label="Top DeFi positions"
            tooltip="On-chain DeFi position discovery pending; live feed lands with Phase 3 vault."
          >
            <PendingValue />
          </DefiRow>
          <DefiRow
            label="Fee accrual MTD"
            tooltip="Fee accrual table pending; daily accrual rolled into next distribution."
          >
            <PendingValue />
          </DefiRow>
          <DefiRow
            label="NAV per share"
            tooltip="Share supply pending Phase 3 vault deployment."
          >
            <PendingValue />
          </DefiRow>
        </ul>
        <p className="mt-6 body-xs ct-text-faint italic leading-[var(--ct-leading-relaxed)]">
          Estimated from methodology v1.0 anchors. Conditional projection — not guaranteed.
        </p>
      </Card>
    </section>
  );
}

interface DefiRowProps {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}

function DefiRow({ label, tooltip, children }: DefiRowProps) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0 border-t border-[var(--ct-border-soft)] first:border-t-0">
      <span className="body-sm ct-text-muted" title={tooltip}>
        {label}
      </span>
      <span className="body-sm ct-text-strong tabular text-right inline-flex items-baseline gap-2">
        {children}
      </span>
    </li>
  );
}

function PendingValue() {
  return (
    <>
      <span className="ct-text-muted">—</span>
      <ProvenanceBadge kind="manual" />
    </>
  );
}

