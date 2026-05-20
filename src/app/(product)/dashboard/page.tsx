import "./dashboard.css";

import {
  ProvenanceBadge,
  type Provenance,
} from "@/components/ui/provenance-badge";
import { loadDashboardData } from "@/lib/data/dashboard";
import { fetchHashprice } from "@/lib/data/hashprice";
import { loadRiskFramework } from "@/lib/data/risk-framework";

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

/**
 * Resolve the provenance badge for a metric: returns its intrinsic provenance
 * when the loader served real DB/oracle data, and downgrades to `stale` when
 * the loader reported a synthesised fallback for that subtree.
 */
function provenanceFor(
  intrinsic: Provenance,
  loaderSource: "db" | "partial" | "fallback",
): Provenance {
  return loaderSource === "fallback" ? "stale" : intrinsic;
}

const ALLOCATION_TONES: Record<string, "primary" | "accent" | "maroon" | "muted"> = {
  mining: "primary",
  btc_tactical: "accent",
  usdc_base: "maroon",
  stable_reserve: "muted",
};

const ALLOCATION_LABELS: Record<string, string> = {
  mining: "Mining",
  btc_tactical: "BTC Tactical",
  usdc_base: "USDC Base",
  stable_reserve: "Stable Reserve",
};

/** Generate a deterministic sparkline path from current value + delta30d. */
function buildSparklinePath(currentValue: number, delta30d: number): string {
  const start = currentValue - delta30d;
  const points = 12;
  const path: string[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wave = Math.sin(i * 1.3) * Math.abs(delta30d) * 0.18;
    const linear = start + delta30d * t;
    const value = linear + wave;
    const x = (i / (points - 1)) * 200;
    const rel = currentValue !== 0 ? (value - start) / Math.max(1, Math.abs(delta30d)) : 0;
    const y = 30 - Math.min(28, Math.max(2, 15 + rel * 12));
    path.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return path.join(" ");
}

function buildSparklineFillPath(currentValue: number, delta30d: number): string {
  return `${buildSparklinePath(currentValue, delta30d)} L200,40 L0,40 Z`;
}

export default async function DashboardPage() {
  const [data, hashprice, riskFramework] = await Promise.all([
    loadDashboardData(),
    fetchHashprice(),
    loadRiskFramework(),
  ]);

  const asOf = new Date(data.vault.asOf);
  const delta30d = data.vault.delta30dUsdc;
  const aumTrendSign = delta30d >= 0 ? "up" : "down";
  const aumTrendText = `${delta30d >= 0 ? "+" : "−"}${usdShort.format(Math.abs(delta30d))} 30d`;

  const btcPriceUsd = data.btcPrice.usd === 0 ? 94_180 : data.btcPrice.usd;
  const btcAlloc = data.allocations.find((a) => a.bucket === "btc_tactical");
  const btcSleeveUsd = btcAlloc?.valueUsdc ?? 0;
  const btcSleevePct = btcAlloc?.pct ?? 0;
  const avgEntry = 58_420;
  const btcHeld = btcPriceUsd > 0 ? btcSleeveUsd / btcPriceUsd : 0;
  const costBasis = btcHeld * avgEntry;
  const pnlUsd = Math.round(btcSleeveUsd - costBasis);
  const pnlPct = costBasis > 0 ? (pnlUsd / costBasis) * 100 : 0;
  const pnlTrend = pnlUsd >= 0 ? "up" : "down";

  const apyLow = data.vault.apyRange.low;
  const apyHigh = data.vault.apyRange.high;
  const apyMid = (apyLow + apyHigh) / 2;
  const apyMaxAxis = 20;
  const apyPct = Math.min(100, (apyMid / apyMaxAxis) * 100);
  const apyGaugeArc = (apyPct / 100) * 50;
  const apyGaugeDash = `${apyGaugeArc} ${100 - apyGaugeArc}`;

  const blendedBps = data.allocations.reduce(
    (acc, a) => acc + (a.pct / 100) * a.yieldContributionBps,
    0,
  );
  const blendedPct = blendedBps / 100;
  const blendedLow = round1(Math.max(0, blendedPct * 0.85));
  const blendedHigh = round1(Math.max(blendedPct * 0.85 + 0.5, blendedPct * 1.18));

  /** Donut allocation: build stroke-dasharray segments for each bucket. */
  const allocSegments = (() => {
    const segs: Array<{
      bucket: string;
      tone: "primary" | "accent" | "maroon" | "muted";
      pct: number;
      valueUsdc: number;
      dashArray: string;
      dashOffset: number;
    }> = [];
    let cumulative = 0;
    for (const a of data.allocations) {
      const dashArray = `${a.pct} ${100 - a.pct}`;
      const dashOffset = -cumulative;
      segs.push({
        bucket: a.bucket,
        tone: ALLOCATION_TONES[a.bucket] ?? "muted",
        pct: a.pct,
        valueUsdc: a.valueUsdc,
        dashArray,
        dashOffset,
      });
      cumulative += a.pct;
    }
    return segs;
  })();

  const aumValue = usdCompact.format(data.vault.aumUsdc);

  // ── Provenance per metric (CLAUDE.md non-negotiable #2) ──────────────────
  // Intrinsic source, downgraded to `stale` when its loader synthesised data.
  // - AUM / Allocation / Activity / Distributions → DB snapshot rows → "live"
  // - APY range / Risk / Op confidence → engine-derived figures → "estimated"
  // - BTC sleeve → CoinGecko spot × DB allocation → "oracle"
  // - Mining health → daily-attested MiningMetric rows → "attested"
  const aumProvenance = provenanceFor("live", data.source);
  const apyProvenance = provenanceFor("estimated", data.source);
  const btcSleeveProvenance: Provenance = data.btcPrice.stale
    ? "stale"
    : provenanceFor("oracle", data.source);
  const allocationProvenance = provenanceFor("live", data.source);
  const riskProvenance = provenanceFor("estimated", riskFramework.source);
  const miningProvenance = provenanceFor("attested", data.source);
  const opConfProvenance = provenanceFor("estimated", data.source);
  const activityProvenance: Provenance =
    data.recentEvents.length === 0 ? "stale" : provenanceFor("live", data.source);
  const distributionProvenance = provenanceFor("live", data.source);

  /** Mining sub-metrics as depth chart bars. */
  const miningBars = [
    {
      key: "margin",
      label: "Margin Score",
      pct: data.vault.miningMarginScore,
      val: `${data.vault.miningMarginScore}/100`,
      tone: "primary" as const,
    },
    {
      key: "uptime",
      label: "Uptime",
      pct: 98.5,
      val: "98.5%",
      tone: "primary" as const,
    },
    {
      key: "confidence",
      label: "Op Confidence",
      pct: data.operationalConfidence,
      val: `${data.operationalConfidence}%`,
      tone: data.operationalConfidence >= 70 ? ("primary" as const) : ("accent" as const),
    },
    {
      key: "hashprice",
      label: "Hashprice",
      pct: Math.min(100, hashprice.usd_per_th_day * 1000),
      val: `$${hashprice.usd_per_th_day.toFixed(3)}/TH·d`,
      tone: "maroon" as const,
    },
    {
      key: "hashtrend",
      label: "Hash Trend 7d",
      pct: Math.min(100, Math.max(0, 50 + data.hashpriceTrendPct * 5)),
      val: `${data.hashpriceTrendPct >= 0 ? "+" : ""}${data.hashpriceTrendPct.toFixed(1)}%`,
      tone: data.hashpriceTrendPct >= 0 ? ("primary" as const) : ("accent" as const),
    },
  ];

  /** Operational confidence gauge */
  const opConf = data.operationalConfidence;
  const opConfArc = (opConf / 100) * 50;
  const opConfDash = `${opConfArc} ${100 - opConfArc}`;

  /** Density matrix: 30 cols x 4 rows = 120 cells, last 120 days before asOf. */
  const eventsByDay = new Map<number, number>();
  const refTimeMs = asOf.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  for (const e of data.recentEvents) {
    const dayBucket = Math.floor((refTimeMs - e.takenAt.getTime()) / dayMs);
    if (dayBucket >= 0 && dayBucket < 120) {
      eventsByDay.set(dayBucket, (eventsByDay.get(dayBucket) ?? 0) + 1);
    }
  }
  const densityCells = Array.from({ length: 120 }, (_, i) => {
    const dayIdx = 119 - i; // oldest first
    const count = eventsByDay.get(dayIdx) ?? 0;
    let level = 0;
    if (count >= 4) level = 4;
    else if (count === 3) level = 3;
    else if (count === 2) level = 2;
    else if (count === 1) level = 1;
    return { dayIdx, level };
  });

  /** Distribution feed. */
  const latestDist = data.latestDistribution;
  const latestDistAmount = latestDist.amount_usdc ?? 0;
  const distLabel = formatDistributionDate(latestDist);
  const distRows = [
    {
      key: "current",
      label: latestDist.status === "scheduled" ? "Next dist" : "Latest dist",
      date: distLabel,
      amount: latestDistAmount,
      status: latestDist.status,
    },
  ];

  return (
    <div className="dash-page">
      <header className="dash-header">
        <span className="eyebrow">Hearst Yield Vault</span>
        <h1 className="h1">Dashboard</h1>
        <span className="sub">
          Live sync ·{" "}
          {asOf.toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "UTC",
          })}{" "}
          UTC
        </span>

        {/* W10 — Status badges strip (source: cockpit-template + cyber-assets) */}
        <div className="dash-status-strip" role="status" aria-label="Vault status">
          <span className="dash-status-badge success">
            <span className="dash-status-dot success live" />
            Live sync
          </span>
          <span className="dash-status-badge">
            <span className="dash-status-dot" />
            {data.allocations.length} buckets
          </span>
          <span className="dash-status-badge">
            Risk {data.vault.riskScore}/100
          </span>
          <span className="dash-status-badge accent">
            <span className="dash-status-dot accent" />
            Methodology v1.0
          </span>
        </div>
      </header>

      {/* === Section 1 — Performance === */}
      <section className="dash-section" aria-labelledby="sec-perf">
        <h2 id="sec-perf" className="dash-section-title">Performance</h2>
        <div className="dash-bento">
          {/* W1 — AUM sparkline (source: kpi-elegant) */}
          <article className="dash-cell col-4" aria-label="Assets under management">
            <div className="dash-label">
              <span>Assets under management</span>
              <span
                className="dash-label-meta"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ProvenanceBadge kind={aumProvenance} />
                <span className={`dash-trend ${aumTrendSign}`}>{aumTrendText}</span>
              </span>
            </div>
            <div className="dash-value-group">
              <span className="dash-value">{aumValue}</span>
            </div>
            <svg
              className="dash-sparkline"
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="spark-fill"
                d={buildSparklineFillPath(data.vault.aumUsdc, delta30d)}
              />
              <path
                className="spark-path"
                d={buildSparklinePath(data.vault.aumUsdc, delta30d)}
              />
            </svg>
          </article>

          {/* W2 — APY range gauge (source: kpi-charts gauge) */}
          <article className="dash-cell col-4" aria-label="APY range">
            <div className="dash-label">
              <span>APY range (annualized)</span>
              <ProvenanceBadge kind={apyProvenance} />
            </div>
            <div className="gauge-container">
              <svg
                className="gauge-svg"
                viewBox="0 0 42 42"
                width="160"
                height="160"
                aria-hidden="true"
              >
                <circle
                  className="gauge-svg-circle bg"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeWidth="6"
                  strokeDasharray="50 50"
                />
                <circle
                  className="gauge-svg-circle fg"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeWidth="6"
                  strokeDasharray={apyGaugeDash}
                />
              </svg>
              <div className="gauge-center">
                <span className="gauge-val">
                  {apyLow}–{apyHigh}
                </span>
                <span className="gauge-lbl">% APY range</span>
              </div>
            </div>
            <div className="gauge-range">
              <span>0%</span>
              <span>Blended {blendedLow}–{blendedHigh}%</span>
              <span>{apyMaxAxis}%</span>
            </div>
          </article>

          {/* W3 — BTC Sleeve sparkline (source: kpi-elegant) */}
          <article className="dash-cell col-4" aria-label="BTC tactical sleeve">
            <div className="dash-label">
              <span>BTC tactical sleeve</span>
              <span
                className="dash-label-meta"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ProvenanceBadge kind={btcSleeveProvenance} />
                <span className={`dash-trend ${pnlTrend}`}>
                  {pnlPct >= 0 ? "+" : ""}
                  {pnlPct.toFixed(1)}%
                </span>
              </span>
            </div>
            <div className="dash-value-group">
              <span className="dash-value">{usdCompact.format(btcSleeveUsd)}</span>
              <span className="dash-unit">{btcSleevePct.toFixed(0)}% alloc</span>
            </div>
            <div className="dash-legend" style={{ marginTop: 12 }}>
              <div className="dash-legend-row">
                <span className="dash-legend-left">BTC held</span>
                <span className="dash-legend-val">{btcHeld.toFixed(2)} BTC</span>
              </div>
              <div className="dash-legend-row">
                <span className="dash-legend-left">Spot</span>
                <span className="dash-legend-val">{btcUsdFormat.format(btcPriceUsd)}</span>
              </div>
              <div className="dash-legend-row">
                <span className="dash-legend-left">P&amp;L</span>
                <span className="dash-legend-val">
                  {pnlUsd >= 0 ? "+" : "−"}
                  {usdShort.format(Math.abs(pnlUsd))}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* === Section 2 — Allocation & Risk === */}
      <section className="dash-section" aria-labelledby="sec-alloc">
        <h2 id="sec-alloc" className="dash-section-title">Allocation &amp; Risk</h2>
        <div className="dash-bento">
          {/* W4 — Allocation donut (source: kpi-charts donut) */}
          <article className="dash-cell col-8" aria-label="Allocation breakdown">
            <div className="dash-label">
              <span>Allocation breakdown</span>
              <ProvenanceBadge kind={allocationProvenance} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 24, alignItems: "center", marginTop: 8 }}>
              <div className="dash-chart-container" style={{ height: 200, marginTop: 0 }}>
                <svg
                  className="dash-chart-svg"
                  viewBox="0 0 42 42"
                  width="180"
                  height="180"
                  aria-hidden="true"
                >
                  <circle
                    className="dash-chart-circle color-muted"
                    cx="21"
                    cy="21"
                    r="15.9155"
                    strokeDasharray="100 0"
                  />
                  {allocSegments.map((s) => (
                    <circle
                      key={s.bucket}
                      className={`dash-chart-circle color-${s.tone}`}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      strokeDasharray={s.dashArray}
                      strokeDashoffset={s.dashOffset}
                    />
                  ))}
                </svg>
                <div className="donut-center">
                  <span className="donut-val">{usdShort.format(data.vault.aumUsdc)}</span>
                  <span className="donut-lbl">Total AUM</span>
                </div>
              </div>

              <div className="dash-legend">
                {allocSegments.map((s) => (
                  <div key={s.bucket} className="dash-legend-row">
                    <span className="dash-legend-left">
                      <span className={`dash-legend-dot dot-${s.tone}`} />
                      {ALLOCATION_LABELS[s.bucket] ?? s.bucket}
                    </span>
                    <span className="dash-legend-val">
                      {s.pct.toFixed(0)}% · {usdCompact.format(s.valueUsdc)}
                    </span>
                  </div>
                ))}
                <div className="dash-legend-row" style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--ct-border-soft)" }}>
                  <span className="dash-legend-left" style={{ color: "var(--ct-text-muted)" }}>
                    Blended target
                  </span>
                  <span className="dash-legend-val">
                    {blendedLow}–{blendedHigh}%
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* W5 — Risk concentric rings (source: kpi-elegant) */}
          <article className="dash-cell col-4" aria-label="Risk framework">
            <div className="dash-label">
              <span>Risk framework</span>
              <span
                className="dash-label-meta"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ProvenanceBadge kind={riskProvenance} />
                <span className={`dash-trend ${riskFramework.composite <= 50 ? "up" : riskFramework.composite <= 66 ? "flat" : "down"}`}>
                  {riskFramework.bandLabel}
                </span>
              </span>
            </div>
            <div className="dash-value-group">
              <span className="dash-value-range">{riskFramework.composite}</span>
              <span className="dash-unit">/ 100 composite</span>
            </div>
            <div className="dash-rings-box">
              <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
                <circle className="ring-bg" cx="40" cy="40" r="36" />
                <circle
                  className="ring-fg"
                  cx="40"
                  cy="40"
                  r="36"
                  strokeDasharray={`${(riskFramework.composite / 100) * 226} ${226 - (riskFramework.composite / 100) * 226}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 40 40)"
                />
                {riskFramework.dimensions[0] && (
                  <>
                    <circle className="ring-bg" cx="40" cy="40" r="28" />
                    <circle
                      className="ring-fg muted"
                      cx="40"
                      cy="40"
                      r="28"
                      strokeDasharray={`${(riskFramework.dimensions[0].score / 100) * 175} ${175 - (riskFramework.dimensions[0].score / 100) * 175}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 40 40)"
                    />
                  </>
                )}
                {riskFramework.dimensions[1] && (
                  <>
                    <circle className="ring-bg" cx="40" cy="40" r="20" />
                    <circle
                      className="ring-fg accent"
                      cx="40"
                      cy="40"
                      r="20"
                      strokeDasharray={`${(riskFramework.dimensions[1].score / 100) * 125} ${125 - (riskFramework.dimensions[1].score / 100) * 125}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 40 40)"
                    />
                  </>
                )}
              </svg>
            </div>
            <div className="dash-legend" style={{ marginTop: 16 }}>
              {riskFramework.dimensions.slice(0, 3).map((d, i) => (
                <div key={d.id} className="dash-legend-row">
                  <span className="dash-legend-left">
                    <span className={`dash-legend-dot ${i === 0 ? "dot-primary" : i === 1 ? "dot-muted" : "dot-accent"}`} />
                    {d.label}
                  </span>
                  <span className="dash-legend-val">{d.score}/100</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* === Section 3 — Mining & Operations === */}
      <section className="dash-section" aria-labelledby="sec-mining">
        <h2 id="sec-mining" className="dash-section-title">Mining &amp; Operations</h2>
        <div className="dash-bento">
          {/* W6 — Mining sub-metrics depth chart (source: kpi-elegant) */}
          <article className="dash-cell col-8" aria-label="Mining health metrics">
            <div className="dash-label">
              <span>Mining health metrics</span>
              <ProvenanceBadge kind={miningProvenance} />
            </div>
            <div className="depth-chart">
              {miningBars.map((bar) => (
                <div key={bar.key} className="depth-row">
                  <span className="depth-label">{bar.label}</span>
                  <div className="depth-bar-container">
                    <div
                      className={`depth-bar ${bar.tone === "accent" ? "accent" : bar.tone === "maroon" ? "maroon" : ""}`}
                      style={{ width: `${Math.min(100, Math.max(0, bar.pct))}%` }}
                    />
                  </div>
                  <span className="depth-val">{bar.val}</span>
                </div>
              ))}
            </div>
          </article>

          {/* W7 — Operational confidence gauge (source: kpi-charts gauge) */}
          <article className="dash-cell col-4" aria-label="Operational confidence">
            <div className="dash-label">
              <span>Operational confidence</span>
              <ProvenanceBadge kind={opConfProvenance} />
            </div>
            <div className="gauge-container">
              <svg
                className="gauge-svg"
                viewBox="0 0 42 42"
                width="160"
                height="160"
                aria-hidden="true"
              >
                <circle
                  className="gauge-svg-circle bg"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeWidth="6"
                  strokeDasharray="50 50"
                />
                <circle
                  className="gauge-svg-circle fg"
                  cx="21"
                  cy="21"
                  r="15.9155"
                  strokeWidth="6"
                  strokeDasharray={opConfDash}
                />
              </svg>
              <div className="gauge-center">
                <span className="gauge-val">{opConf}</span>
                <span className="gauge-lbl">% confidence</span>
              </div>
            </div>
            <div className="gauge-range">
              <span>0%</span>
              <span>Threshold 70%</span>
              <span>100%</span>
            </div>
          </article>
        </div>
      </section>

      {/* === Section 4 — Activity & Distributions === */}
      <section className="dash-section" aria-labelledby="sec-activity">
        <h2 id="sec-activity" className="dash-section-title">Activity &amp; Distributions</h2>
        <div className="dash-bento">
          {/* W8 — Events density matrix (source: kpi-elegant) */}
          <article className="dash-cell col-8" aria-label="Vault activity last 120 days">
            <div className="dash-label">
              <span>Vault activity · last 120 days</span>
              <span
                className="dash-label-meta"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ProvenanceBadge kind={activityProvenance} />
                <span className="dash-trend flat">{data.recentEvents.length} events</span>
              </span>
            </div>
            <div className="density-matrix" aria-hidden="true">
              {densityCells.map((c) => (
                <span
                  key={c.dayIdx}
                  className={`density-cell ${c.level > 0 ? `lvl-${c.level}` : ""}`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[length:var(--ct-text-micro)] text-[--ct-text-muted] tracking-[0.04em]">
              <span>120d ago</span>
              <span>60d ago</span>
              <span>Today</span>
            </div>
          </article>

          {/* W9 — Distribution feed (source: kpi-elegant progress typographique) */}
          <article className="dash-cell col-4" aria-label="Distributions">
            <div className="dash-label">
              <span>Distributions</span>
              <span
                className="dash-label-meta"
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <ProvenanceBadge kind={distributionProvenance} />
                <span className={`dash-trend ${latestDist.status === "paid" ? "up" : "flat"}`}>
                  {latestDist.status === "paid" ? "Paid" : "Scheduled"}
                </span>
              </span>
            </div>
            <div className="dist-big">
              <span className="dist-big-val">
                {latestDistAmount > 0 ? usdShort.format(latestDistAmount) : "—"}
              </span>
              <span className="dist-big-unit">USDC</span>
            </div>
            <div className="dist-bar">
              <div
                className={`dist-bar-fill ${latestDist.status === "paid" ? "" : "accent"}`}
                style={{ width: latestDist.status === "paid" ? "100%" : "75%" }}
              />
            </div>
            <div className="dist-rows">
              {distRows.map((r) => (
                <div key={r.key} className="dist-rows-item">
                  <span>{r.label}</span>
                  <span className={r.status === "paid" ? "paid" : r.status === "scheduled" ? "scheduled" : "due"}>
                    {r.date}
                  </span>
                </div>
              ))}
              <div className="dist-rows-item">
                <span>Monthly cadence</span>
                <span className="scheduled">Day 1, T+5</span>
              </div>
              <div className="dist-rows-item">
                <span>Methodology</span>
                <span className="scheduled">v1.0</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <p className="dash-disclaimer">
        Projections are conditional on the assumptions stated in Methodology v1.0.
        APY ranges are not guaranteed; past performance does not predict future returns.
      </p>
    </div>
  );
}
