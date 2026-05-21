import type { ReactNode } from "react";

interface PortfolioCockpitProps {
  /** Pre-rendered server slots (cells). */
  greeting: ReactNode;
  kpis: ReactNode;
  donut: ReactNode;
  chart: ReactNode;
  positions: ReactNode;
  activity: ReactNode;
}

/**
 * Portfolio cockpit shell — fixed, no-scroll grid bounded to the centre
 * (Section 2). Three stacked zones:
 *   - greeting + KPI band
 *   - row 2: donut (left) + portfolio value (rest of width)
 *   - row 3: positions (wide) + recent activity (~40%)
 *
 * Pure layout — no interactivity, so it stays a Server Component. The
 * subscription flow (SubscribePanel + subscribe action) lives separately and
 * is triggered elsewhere.
 */
export function PortfolioCockpit({
  greeting,
  kpis,
  donut,
  chart,
  positions,
  activity,
}: PortfolioCockpitProps) {
  return (
    <div className="pf-fixed">
      <div className="pf-fixed-greeting">{greeting}</div>
      <div className="pf-fixed-kpis">{kpis}</div>

      <div className="pf-fixed-body">
        {/* Row 2 — donut (left) + portfolio value (rest of the width) */}
        <div className="pf-row-charts">
          {donut}
          {chart}
        </div>

        {/* Row 3 — positions (wide) + recent activity (~40%) */}
        <div className="pf-row-lower">
          <div className="pf-fixed-positions">{positions}</div>
          {activity}
        </div>
      </div>
    </div>
  );
}
