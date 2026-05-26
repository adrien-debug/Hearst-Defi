import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiskScore {
  dimension:
    | "market"
    | "mining"
    | "liquidity"
    | "smart_contract"
    | "counterparty";
  score: number; // 0–100
  delta30d: number; // can be negative
  series30d?: number[]; // optional 30-point sparkline
}

export type CompositeLabel =
  | "Low"
  | "Low–Moderate"
  | "Moderate"
  | "Elevated"
  | "High";

export interface RiskPulseProps {
  scores: RiskScore[]; // expects 5 entries
  composite: number; // 0–100
  compositeLabel: CompositeLabel;
  composite30dTrend: "rising" | "stable" | "falling";
}

// ── Helpers (exported for unit tests) ────────────────────────────────────────

const DIMENSION_LABEL: Record<RiskScore["dimension"], string> = {
  market: "Market",
  mining: "Mining",
  liquidity: "Liquidity",
  smart_contract: "Smart contract",
  counterparty: "Counterparty",
};

/** Map composite label → CSS token colour class for the composite value. */
export function compositeLabelColor(label: CompositeLabel): string {
  switch (label) {
    case "Low":
      return "text-[var(--ct-status-success)]";
    case "Low–Moderate":
      return "text-[var(--ct-accent)]";
    case "Moderate":
      return "text-[var(--ct-status-warning)]";
    case "Elevated":
    case "High":
      return "text-[var(--ct-status-danger)]";
  }
}

/**
 * Given a delta30d value, return the icon character and colour class.
 *
 * Risk semantics: rising risk (delta > 0) = bad → danger.
 *                 falling risk (delta < 0) = good → success.
 */
export function trendMeta(delta: number): {
  icon: string;
  colorClass: string;
  ariaLabel: string;
} {
  if (delta > 0) {
    return {
      icon: "▲",
      colorClass: "text-[var(--ct-status-danger)]",
      ariaLabel: `rising +${delta}`,
    };
  }
  if (delta < 0) {
    return {
      icon: "▼",
      colorClass: "text-[var(--ct-status-success)]",
      ariaLabel: `falling ${delta}`,
    };
  }
  return {
    icon: "━━",
    colorClass: "text-[var(--ct-text-faint)]",
    ariaLabel: "stable",
  };
}

/** Build a minimal inline SVG sparkline from a series of 0–100 values. */
export function buildSparklinePath(series: number[]): string {
  if (series.length < 2) return "";
  const w = 64;
  const h = 20;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M ${points.join(" L ")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface TrendIndicatorProps {
  delta: number;
}

function TrendIndicator({ delta }: TrendIndicatorProps) {
  const { icon, colorClass, ariaLabel } = trendMeta(delta);
  const numericLabel =
    delta === 0
      ? "0"
      : delta > 0
        ? `+${String(delta)}`
        : String(delta);

  return (
    <span className={cn("tabular font-medium text-xs", colorClass)}>
      <span aria-hidden>{icon}</span>{" "}
      <span className="sr-only">{ariaLabel}</span>
      {numericLabel}
    </span>
  );
}

interface SparklineProps {
  series: number[];
  label: string;
}

function Sparkline({ series, label }: SparklineProps) {
  const d = buildSparklinePath(series);
  if (!d) return null;
  return (
    <svg
      width={64}
      height={20}
      aria-label={label}
      role="img"
      className="shrink-0"
      viewBox="0 0 64 20"
      fill="none"
    >
      <path
        d={d}
        stroke="var(--ct-text-faint)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ScoreRowProps {
  item: RiskScore;
}

function ScoreRow({ item }: ScoreRowProps) {
  const label = DIMENSION_LABEL[item.dimension];
  const rowId = `risk-pulse-row-${item.dimension}`;

  return (
    <li
      role="group"
      aria-labelledby={rowId}
      className="flex items-center gap-3 py-2.5 ct-divide-soft"
    >
      {/* Dimension label */}
      <span
        id={rowId}
        className="body-sm min-w-[7.5rem] text-[var(--ct-text-muted)]"
      >
        {label}
      </span>

      {/* Score */}
      <span
        className="tabular font-semibold text-sm text-[var(--ct-text-primary)] w-7 text-right shrink-0"
        aria-label={`${label} score ${String(item.score)} out of 100`}
      >
        {item.score}
      </span>

      {/* Optional sparkline */}
      {item.series30d !== undefined && item.series30d.length >= 2 ? (
        <Sparkline
          series={item.series30d}
          label={`${label} 30-day trend sparkline`}
        />
      ) : (
        /* Placeholder gap so columns stay aligned when no sparkline */
        <span className="w-16 shrink-0" aria-hidden />
      )}

      {/* Delta / trend */}
      <TrendIndicator delta={item.delta30d} />
    </li>
  );
}

interface CompositeSectionProps {
  composite: number;
  compositeLabel: CompositeLabel;
  trend: RiskPulseProps["composite30dTrend"];
}

function CompositeSection({
  composite,
  compositeLabel,
  trend,
}: CompositeSectionProps) {
  const trendIcon =
    trend === "rising" ? "▲ rising" : trend === "falling" ? "▼ falling" : "━━ stable";

  return (
    <div
      role="status"
      aria-label={`Composite risk score ${String(composite)} out of 100, ${compositeLabel}, 30-day trend ${trend}`}
      className="mt-5 flex items-center justify-between rounded-[var(--ct-radius-lg)] glass-panel-subtle px-4 py-4"
    >
      <div className="flex items-baseline gap-2">
        <span aria-hidden className="text-[var(--ct-accent)] text-lg leading-none">
          ◆
        </span>
        <span className="stat-label">Composite</span>
        <span
          className={cn(
            "tabular font-extrabold text-xl leading-none",
            compositeLabelColor(compositeLabel),
          )}
        >
          {composite}
          <span className="text-sm font-medium text-[var(--ct-text-faint)]">
            {" "}/ 100
          </span>
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "text-xs font-semibold tracking-wide",
            compositeLabelColor(compositeLabel),
          )}
        >
          {compositeLabel}
        </span>
        <span className="text-xs text-[var(--ct-text-faint)]">
          30d trend{" "}
          <span aria-hidden>{trendIcon}</span>
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RiskPulse({
  scores,
  composite,
  compositeLabel,
  composite30dTrend,
}: RiskPulseProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Pulse</CardTitle>
        <ProvenanceBadge kind="live" />
      </CardHeader>

      <ul className="ct-divide-soft" aria-label="Risk dimension scores">
        {scores.map((item) => (
          <ScoreRow key={item.dimension} item={item} />
        ))}
      </ul>

      <CompositeSection
        composite={composite}
        compositeLabel={compositeLabel}
        trend={composite30dTrend}
      />

      <p className="mt-4 body-xs italic leading-[var(--ct-leading-relaxed)]">
        Scores are 0–100 (higher = more risk). Composite is the weighted sum of
        the five dimensions per Methodology v1.0. Conditional projection — not
        guaranteed.
      </p>
    </Card>
  );
}
