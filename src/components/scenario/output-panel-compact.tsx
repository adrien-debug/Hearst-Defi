import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import {
  BUCKET_COLOR,
  BUCKET_LABEL,
  CONFIDENCE_VARIANT,
  progressScoreFillClass,
} from "@/components/scenario/output-panel-shared";
import type { ScenarioOutput } from "@/lib/engine/types";

const MODE_LABEL: Record<ScenarioOutput["mode"], string> = {
  defensive: "Defensive",
  balanced: "Balanced",
  opportunistic: "Opportunistic",
};

const MODE_VARIANT: Record<
  ScenarioOutput["mode"],
  "danger" | "default" | "success"
> = {
  defensive: "danger",
  balanced: "default",
  opportunistic: "success",
};

// ── delta helpers ────────────────────────────────────────────────────────────

interface ApyDelta {
  /** B − A on the midpoint of the APY range, in absolute APY % points. */
  value: number;
}

interface RiskDelta {
  /** B − A on the 0–100 risk score. */
  value: number;
}

function computeApyDelta(
  a: ScenarioOutput,
  b: ScenarioOutput,
): ApyDelta {
  const midA = (a.apy_range.low + a.apy_range.high) / 2;
  const midB = (b.apy_range.low + b.apy_range.high) / 2;
  return { value: midB - midA };
}

function computeRiskDelta(
  a: ScenarioOutput,
  b: ScenarioOutput,
): RiskDelta {
  return { value: b.risk_score - a.risk_score };
}

function formatSignedFixed(n: number, precision: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "±";
  return `${sign}${Math.abs(n).toFixed(precision)}`;
}

function formatSignedInt(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "±";
  return `${sign}${Math.abs(Math.round(n))}`;
}

// ── compact components ───────────────────────────────────────────────────────

interface OutputPanelCompactProps {
  output: ScenarioOutput;
  presetLabel: string;
  side: "A" | "B";
  /** Optional comparison reference (the other panel). When present on side B,
   * deltas are rendered under hero APY and risk score. */
  vs?: ScenarioOutput | null;
  isPending?: boolean;
}

export function OutputPanelCompact({
  output,
  presetLabel,
  side,
  vs,
  isPending,
}: OutputPanelCompactProps) {
  const riskColorClass = progressScoreFillClass(output.risk_score, true);
  const miningColorClass = progressScoreFillClass(output.mining_margin_score, false);

  const showDeltas = side === "B" && vs !== null && vs !== undefined;
  const apyDelta = showDeltas ? computeApyDelta(vs, output) : null;
  const riskDelta = showDeltas ? computeRiskDelta(vs, output) : null;

  // For APY: higher is "better" (positive delta = green).
  // For Risk: higher is "worse" (positive delta = red).
  const apyDeltaToneClass = apyDelta
    ? apyDelta.value > 0.05
      ? "text-[--ct-status-success]"
      : apyDelta.value < -0.05
        ? "text-[--ct-status-danger]"
        : "text-[--ct-text-muted]"
    : "";

  const riskDeltaToneClass = riskDelta
    ? riskDelta.value > 0.5
      ? "text-[--ct-status-danger]"
      : riskDelta.value < -0.5
        ? "text-[--ct-status-success]"
        : "text-[--ct-text-muted]"
    : "";

  return (
    <section
      className={cn(
        "relative flex flex-col gap-4 glass-panel p-5",
        "border-l-4",
        side === "A"
          ? "border-l-[--ct-border-strong]"
          : "border-l-[--ct-text-strong]",
        "transition-opacity duration-[var(--ct-dur-fast)]",
        isPending && "pointer-events-none opacity-50",
      )}
      aria-busy={isPending}
      aria-label={`Scenario ${side}: ${presetLabel}`}
    >
      {/* Header */}
      <header className="flex flex-col gap-0.5">
        <span className="eyebrow">Scenario {side}</span>
        <h3 className="h3 truncate" title={presetLabel}>
          {presetLabel}
        </h3>
      </header>

      {/* ── APY Hero ─────────────────────────────────────────────────── */}
      <div className="glass-panel-subtle p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h4 className="h4 text-[--ct-text-strong]">Projected APY</h4>
          <ProvenanceBadge kind="estimated" />
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <ApyRange
            low={output.apy_range.low}
            high={output.apy_range.high}
            className={cn(
              "mono text-4xl font-extrabold tabular-nums",
              "text-[--ct-text-strong] leading-none",
            )}
          />
          <div className="flex flex-col items-end gap-1">
            <span className="stat-label text-micro">Confidence</span>
            <Badge
              variant={CONFIDENCE_VARIANT[output.confidence]}
              className="text-micro"
            >
              {output.confidence.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* APY delta vs A (only on B) */}
        {apyDelta && (
          <p
            className={cn(
              "mt-3 mono text-xs font-semibold tabular-nums",
              apyDeltaToneClass,
            )}
            aria-label={`APY midpoint delta vs Scenario A: ${apyDelta.value.toFixed(2)} percentage points`}
          >
            Δ {formatSignedFixed(apyDelta.value, 2)} pts{" "}
            <span className="font-sans font-normal text-[--ct-text-muted]">
              midpoint vs Scenario A
            </span>
          </p>
        )}
      </div>

      {/* ── Risk + Mining 2×1 ───────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Risk Score */}
        <div className="glass-panel-subtle p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="stat-label text-micro">Risk Score</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="mono text-xl font-extrabold tabular-nums text-[--ct-text-primary]">
              {output.risk_score.toFixed(0)}
            </span>
            <span className="text-xs text-[--ct-text-muted]">/100</span>
          </div>
          <Progress
            value={output.risk_score}
            fillClassName={riskColorClass}
            className="mt-1.5"
          />
          {/* Risk delta (only on B) */}
          {riskDelta && (
            <p
              className={cn(
                "mt-2 mono text-micro font-semibold tabular-nums",
                riskDeltaToneClass,
              )}
              aria-label={`Risk score delta vs Scenario A: ${Math.round(riskDelta.value)}`}
            >
              Δ {formatSignedInt(riskDelta.value)}{" "}
              <span className="font-sans font-normal text-[--ct-text-muted]">
                vs A
              </span>
            </p>
          )}
        </div>

        {/* Mining Margin */}
        <div className="glass-panel-subtle p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="stat-label text-micro">
              Mining Margin
            </span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="mono text-xl font-extrabold tabular-nums text-[--ct-text-primary]">
              {output.mining_margin_score.toFixed(0)}
            </span>
            <span className="text-xs text-[--ct-text-muted]">/100</span>
          </div>
          <Progress
            value={output.mining_margin_score}
            fillClassName={miningColorClass}
            className="mt-1.5"
          />
          <p className="mt-2 text-micro text-[--ct-text-muted]">
            Current vs target
          </p>
        </div>
      </div>

      {/* ── Vault Mode ───────────────────────────────────────────────── */}
      <div className="glass-panel-subtle p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="stat-label text-micro">Vault Mode</p>
            <p className="mt-0.5 text-micro text-[--ct-text-muted]">
              Allocation posture
            </p>
          </div>
          <Badge
            variant={MODE_VARIANT[output.mode]}
            className="px-3 py-1.5 text-xs"
          >
            {MODE_LABEL[output.mode]}
          </Badge>
        </div>
      </div>

      {/* ── Allocation (compact table, no stacked bar) ────────────────── */}
      <div className="glass-panel-subtle p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h4 className="h4 text-[--ct-text-strong]">Allocation</h4>
          <ProvenanceBadge kind="estimated" />
        </div>

        <div>
          <div className="mb-1.5 grid grid-cols-[1fr_auto_auto] gap-x-3 text-micro font-semibold uppercase tracking-wide text-[--ct-text-muted]">
            <span>Bucket</span>
            <span className="text-right">Pct</span>
            <span className="text-right">Yield</span>
          </div>
          <ul className="divide-y divide-[--ct-border-soft]">
            {output.allocations.map((a) => (
              <li
                key={a.bucket}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 py-1.5 text-sm first:pt-0.5 last:pb-0.5"
              >
                <span className="flex min-w-0 items-center gap-2 text-[--ct-text-body]">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full shadow-[var(--ct-glow-dot)] bg-current"
                    style={{ color: BUCKET_COLOR[a.bucket] }}
                    aria-hidden
                  />
                  <span className="truncate">{BUCKET_LABEL[a.bucket]}</span>
                </span>
                <span className="text-right mono tabular-nums text-[--ct-text-primary]">
                  {a.pct.toFixed(0)}%
                </span>
                <span className="text-right mono text-xs tabular-nums text-[--ct-text-muted]">
                  {a.yield_contribution_bps > 0
                    ? `+${a.yield_contribution_bps}bps`
                    : "P&L"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
