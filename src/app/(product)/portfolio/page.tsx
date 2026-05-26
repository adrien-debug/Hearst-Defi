import "./portfolio.css";

import { loadPortfolio } from "@/lib/demo/loaders";
import { getInvestor } from "@/lib/auth/session";
import {
  loadLockMeterProps,
  loadRiskPulseProps,
  loadDistribCalendarProps,
  loadProofPulseProps,
  loadYieldStackProps,
} from "@/lib/data/portfolio";

import { PortfolioGreeting } from "@/components/portfolio/portfolio-greeting";
import { PortfolioKpiRow } from "@/components/portfolio/kpi-row";
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { ValueChart } from "@/components/portfolio/value-chart";
import { PositionsList } from "@/components/portfolio/positions-list";
import { RecentActivity } from "@/components/portfolio/recent-activity";
import { LockMeter } from "@/components/portfolio/lock-meter";
import { RiskPulse } from "@/components/portfolio/risk-pulse";
import { DistribCalendar } from "@/components/portfolio/distrib-calendar";
import { ProofPulse } from "@/components/portfolio/proof-pulse";
import { YieldStack } from "@/components/portfolio/yield-stack";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portfolio",
  description: "Your positions and distributions",
};

/** Derive a friendly display name from the investor identity. */
function displayName(
  investor: { email: string | null; walletAddress: string | null } | null,
): string {
  if (investor?.email) {
    const local = investor.email.split("@")[0] ?? "";
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  const w = investor?.walletAddress;
  if (w) return `${w.slice(0, 6)}…${w.slice(-4)}`;
  return "Investor";
}

// ---------------------------------------------------------------------------
// Section wrappers — semantic sections with border separators
// ---------------------------------------------------------------------------

interface SectionProps {
  "data-section": string;
  children: React.ReactNode;
  label?: string;
}

function Section({ "data-section": dataSectionAttr, children, label }: SectionProps) {
  return (
    <section
      data-section={dataSectionAttr}
      aria-label={label}
      className="flex flex-col gap-6 border-t border-[var(--ct-border-soft)] pt-8 first:border-t-0 first:pt-0"
    >
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Surprise & Delight bar — export PDF / preview 1099 / LP secondary (V2)
// ---------------------------------------------------------------------------

function SurpriseDelightBar() {
  return (
    <div
      data-testid="surprise-delight-bar"
      className="flex flex-wrap items-center gap-3 rounded-[var(--ct-radius-lg)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-1)] px-5 py-3"
    >
      <span className="body-xs font-semibold uppercase tracking-[var(--ct-tracking-wide)] text-[var(--ct-text-muted)] mr-auto">
        Tools
      </span>

      {/* Export PDF statement */}
      <button
        type="button"
        className="body-xs flex items-center gap-1.5 rounded-[var(--ct-radius-md)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-2)] px-3 py-1.5 text-[var(--ct-text-body)] transition-colors hover:border-[var(--ct-border-accent)] hover:text-[var(--ct-text-primary)]"
        aria-label="Export PDF statement"
      >
        <span aria-hidden>↓</span> Export PDF statement
      </button>

      {/* Preview 1099 / CRS */}
      <button
        type="button"
        className="body-xs flex items-center gap-1.5 rounded-[var(--ct-radius-md)] border border-[var(--ct-border-soft)] bg-[var(--ct-surface-2)] px-3 py-1.5 text-[var(--ct-text-body)] transition-colors hover:border-[var(--ct-border-accent)] hover:text-[var(--ct-text-primary)]"
        aria-label="Preview 1099 or CRS document"
      >
        <span aria-hidden>📄</span> Preview 1099 / CRS
      </button>

      {/* LP → LP secondary (V2 badge) */}
      <span
        className="body-xs flex items-center gap-1.5 rounded-[var(--ct-radius-md)] border border-dashed border-[var(--ct-border-soft)] px-3 py-1.5 text-[var(--ct-text-faint)] opacity-60"
        title="Available in V2"
        aria-label="LP to LP secondary transfer — available in version 2"
      >
        LP→LP secondary{" "}
        <span className="inline-block rounded-[var(--ct-radius-sm)] bg-[var(--ct-surface-3)] px-1 py-0.5 font-bold uppercase tracking-wide text-[var(--ct-accent)]">
          V2
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NAV / share KPI card — extra KPI for Section 1 Hero Pulse
// ---------------------------------------------------------------------------

interface NavShareKpiProps {
  positions: Array<{ principalUsdc: number }>;
  totalValueUsdc: number;
  source: "live" | "fallback";
}

function NavShareKpi({ positions, totalValueUsdc, source }: NavShareKpiProps) {
  const provenance = source === "fallback" ? "stale" : "live";
  const totalPrincipal = positions.reduce((s, p) => s + p.principalUsdc, 0);
  // NAV/share: totalValueUsdc / number of "shares" proxied by principal units.
  // We use $1 par share = each $1 of principal is 1 share.
  const shares = totalPrincipal > 0 ? totalPrincipal : 1;
  const navPerShare = totalValueUsdc > 0 ? totalValueUsdc / shares : 1;

  return (
    <article className="dash-cell" aria-label="NAV per share" data-testid="nav-share-kpi">
      <div className="dash-label">
        <span>NAV / share</span>
        <ProvenanceBadge kind={provenance} />
      </div>
      <div className="dash-value-group">
        <span className="dash-value">
          {navPerShare.toFixed(4)}
        </span>
        <span className="dash-unit">USDC</span>
      </div>
      <p className="body-xs ct-text-muted mt-2">Par $1.00 · class A</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Position Value KPI — explicit card separate from "Portfolio Value"
// ---------------------------------------------------------------------------

interface PositionValueKpiProps {
  totalValueUsdc: number;
  source: "live" | "fallback";
}

function PositionValueKpi({ totalValueUsdc, source }: PositionValueKpiProps) {
  const provenance = source === "fallback" ? "stale" : "live";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <article className="dash-cell" aria-label="Position value" data-testid="position-value-kpi">
      <div className="dash-label">
        <span>Position Value</span>
        <ProvenanceBadge kind={provenance} />
      </div>
      <div className="dash-value-group">
        <span className="dash-value">
          {totalValueUsdc > 0 ? fmt.format(totalValueUsdc) : "—"}
        </span>
        <span className="dash-unit">USDC</span>
      </div>
      <p className="body-xs ct-text-muted mt-2">Principal + accrued yield</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PortfolioPage() {
  const [
    data,
    investor,
    lockMeterPropsRaw,
    riskPulsePropsRaw,
    distribCalendarPropsRaw,
    proofPulsePropsRaw,
    yieldStackPropsRaw,
  ] = await Promise.all([
    loadPortfolio(),
    getInvestor(),
    loadLockMeterProps(),
    loadRiskPulseProps(),
    loadDistribCalendarProps(),
    loadProofPulseProps(),
    loadYieldStackProps(),
  ]);

  const name = displayName(investor);

  // Strip the `source` field before forwarding to widget components
  // (widgets don't accept it — it's used only for ProvenanceBadge decisions here).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _lmSource, ...lockMeterProps } = lockMeterPropsRaw;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _rpSource, ...riskPulseProps } = riskPulsePropsRaw;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _dcSource, ...distribCalendarProps } = distribCalendarPropsRaw;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _ppSource, ...proofPulseProps } = proofPulsePropsRaw;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source: _ysSource, ...yieldStackProps } = yieldStackPropsRaw;

  return (
    <div className="space-y-12" data-testid="portfolio-page">

      {/* ── Section 1 — Hero Pulse ────────────────────────────────────────── */}
      <Section data-section="hero-pulse" label="Hero Pulse — key portfolio metrics">
        <PortfolioGreeting name={name} data={data} />

        {/* 5 KPI cards: NAV/share · Position Value · APY · Next Distribution · Lock·Liquidity */}
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
          data-testid="hero-kpi-grid"
        >
          <NavShareKpi
            positions={data.positions}
            totalValueUsdc={data.totalValueUsdc}
            source={data.source}
          />
          <PositionValueKpi
            totalValueUsdc={data.totalValueUsdc}
            source={data.source}
          />
          {/* Yield YTD + Next Distribution live inside PortfolioKpiRow — split
              the grid by rendering the KPI row spanning 3 cols so it fills the
              remaining slots inside the 5-col hero grid. */}
          <div className="contents">
            <PortfolioKpiRow data={data} />
          </div>
          {/* Lock·Liquidity widget (widget H) */}
          <div data-testid="lock-meter-widget">
            <LockMeter {...lockMeterProps} />
          </div>
        </div>

        {/* NAV 13-month area chart */}
        <ValueChart
          positions={data.positions}
          totalValueUsdc={data.totalValueUsdc}
          source={data.source}
        />
      </Section>

      {/* ── Section 2 — Yield Posture ────────────────────────────────────── */}
      <Section data-section="yield-posture" label="Yield Posture — allocation and risk breakdown">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Allocation donut (existing) */}
          <AllocationDonut
            positions={data.positions}
            totalValueUsdc={data.totalValueUsdc}
            source={data.source}
          />

          {/* Yield source stack (widget L) */}
          <div data-testid="yield-stack-widget">
            <YieldStack {...yieldStackProps} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Risk Pulse 5 scores (widget I) */}
          <div data-testid="risk-pulse-widget">
            <RiskPulse {...riskPulseProps} />
          </div>

          {/* Positions table (existing) */}
          <PositionsList positions={data.positions} source={data.source} />
        </div>
      </Section>

      {/* ── Section 3 — Activity, Proofs & Distributions ─────────────────── */}
      <Section data-section="activity-proofs" label="Activity, Proofs and Distributions">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Distributions Calendar (widget J) */}
          <div data-testid="distrib-calendar-widget">
            <DistribCalendar {...distribCalendarProps} />
          </div>

          {/* Proof & Methodology Pulse (widget K) */}
          <div data-testid="proof-pulse-widget">
            <ProofPulse {...proofPulseProps} />
          </div>
        </div>

        {/* Recent Activity (existing) */}
        <RecentActivity
          transactions={data.recentTransactions}
          source={data.source}
        />

        {/* Surprise & Delight bar */}
        <SurpriseDelightBar />
      </Section>

    </div>
  );
}
