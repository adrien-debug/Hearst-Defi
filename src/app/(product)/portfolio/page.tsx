import "../dashboard/dashboard.css";

import Link from "next/link";
import { loadPortfolio } from "@/lib/demo/loaders";
import { PortfolioKpiRow } from "@/components/portfolio/kpi-row";
import { AllocationDonut } from "@/components/portfolio/allocation-donut";
import { ValueChart } from "@/components/portfolio/value-chart";
import { PositionsList } from "@/components/portfolio/positions-list";
import { RecentActivity } from "@/components/portfolio/recent-activity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portfolio",
  description: "Your positions and distributions",
};

export default async function PortfolioPage() {
  const data = await loadPortfolio();

  return (
    <div className="dash-page">
      <header className="dash-header">
        <span className="eyebrow">Hearst Yield Vault</span>
        <h1 className="h1">Portfolio</h1>
        <span className="sub">Your positions &amp; distributions</span>
      </header>

      {/* Empty state */}
      {data.positions.length === 0 && (
        <div className="dash-bento">
          <article
            className="dash-cell col-12"
            style={{ alignItems: "center", justifyContent: "center", textAlign: "center", gap: "var(--ct-space-4)" }}
          >
            {/* Icon — simple SVG inline, no new primitive */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              style={{ color: "var(--ct-text-muted)", margin: "0 auto var(--ct-space-2)" }}
            >
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="body-lg" style={{ color: "var(--ct-text-primary)", fontWeight: "var(--ct-font-semibold)" }}>
              No open positions
            </p>
            <p className="body-sm" style={{ color: "var(--ct-text-muted)", maxWidth: "26rem" }}>
              Subscribe to the Hearst Yield Vault to start earning structured yield backed by mining operations.
              Minimum ticket $250k · 60-day soft lock-up.
            </p>
            <Link
              href="/vaults"
              style={{
                display: "inline-block",
                marginTop: "var(--ct-space-2)",
                padding: "var(--ct-space-2_5) var(--ct-space-6)",
                background: "var(--ct-accent)",
                color: "var(--ct-text-strong)",
                borderRadius: "var(--ct-radius-full)",
                fontWeight: "var(--ct-font-bold)",
                fontSize: "var(--ct-text-sm)",
                textDecoration: "none",
                transition: "opacity var(--ct-dur-base) var(--ct-ease)",
              }}
            >
              View Vaults
            </Link>
          </article>
        </div>
      )}

      {/* Populated state */}
      {data.positions.length > 0 && (
        <>
          {/* Section 1 — KPIs */}
          <section className="dash-section" aria-labelledby="sec-kpis">
            <h2 id="sec-kpis" className="dash-section-title">Overview</h2>
            <PortfolioKpiRow data={data} />
          </section>

          {/* Section 2 — Value chart + Donut */}
          <section className="dash-section" aria-labelledby="sec-allocation">
            <h2 id="sec-allocation" className="dash-section-title">Allocation &amp; Trend</h2>
            <div className="dash-bento">
              <ValueChart
                positions={data.positions}
                totalValueUsdc={data.totalValueUsdc}
                source={data.source}
              />
              <AllocationDonut
                positions={data.positions}
                totalValueUsdc={data.totalValueUsdc}
                source={data.source}
              />
            </div>
          </section>

          {/* Section 3 — Positions + Activity */}
          <section className="dash-section" aria-labelledby="sec-positions">
            <h2 id="sec-positions" className="dash-section-title">Positions &amp; Activity</h2>
            <div className="dash-bento">
              <PositionsList positions={data.positions} source={data.source} />
              <RecentActivity transactions={data.recentTransactions} source={data.source} />
            </div>
          </section>
        </>
      )}

      <p className="dash-disclaimer">
        Projections are conditional on the assumptions stated in Methodology v1.0.
        APY ranges are not guaranteed; past performance does not predict future results.
        Yield figures are indicative and subject to change based on vault conditions.
      </p>
    </div>
  );
}
