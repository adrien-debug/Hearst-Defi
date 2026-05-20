import "../product-bento.css";

import Link from "next/link";
import { loadPortfolio } from "@/lib/demo/loaders";
import { Button } from "@/components/ui/button";
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
            className="dash-cell col-12 items-center justify-center text-center gap-4"
          >
            {/* Icon — simple SVG inline, no new primitive */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              aria-hidden="true"
              className="ct-text-muted mx-auto mb-2"
            >
              <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16 24h16M24 16v16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="body-lg ct-text-primary font-semibold">
              No open positions
            </p>
            <p className="body-sm ct-text-muted max-w-[26rem]">
              Subscribe to the Hearst Yield Vault to start earning structured yield backed by mining operations.
              Minimum ticket $250k · 60-day soft lock-up.
            </p>
            <Button asChild variant="primary" size="sm" className="mt-2">
              <Link href="/vaults">View Vaults</Link>
            </Button>
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
