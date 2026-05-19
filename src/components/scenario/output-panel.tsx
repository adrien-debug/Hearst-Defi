"use client";

import { useState } from "react";

import { NavSparkline } from "@/components/scenario/nav-sparkline";
import { PtaiBlock } from "@/components/scenario/ptai-block";
import { RebalancingActions } from "@/components/scenario/rebalancing-actions";
import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type {
  AllocationBucket,
  BtcGuardrail,
  BtcGuardrailKind,
  ScenarioOutput,
} from "@/lib/engine/types";

interface OutputPanelProps {
  output: ScenarioOutput;
  isPending: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const BUCKET_LABEL: Record<AllocationBucket, string> = {
  mining: "Mining cashflow",
  btc_tactical: "BTC tactical",
  usdc_base: "USDC base yield",
  stable_reserve: "Stable reserve",
};

const BUCKET_COLOR: Record<AllocationBucket, string> = {
  mining: "var(--ct-text-strong)",
  btc_tactical: "var(--ct-status-warning)",
  usdc_base: "var(--ct-status-info)",
  stable_reserve: "var(--ct-text-muted)",
};

const CONFIDENCE_VARIANT: Record<
  ScenarioOutput["confidence"],
  "danger" | "warning" | "success"
> = {
  low: "danger",
  medium: "warning",
  high: "success",
};

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

const GUARDRAIL_STATUS_VARIANT: Record<
  BtcGuardrail["status"],
  "success" | "default" | "warning" | "danger"
> = {
  healthy: "success",
  normal: "default",
  warning: "warning",
  breached: "danger",
};

const GUARDRAIL_KIND_LABEL: Record<BtcGuardrailKind, string> = {
  volatility: "Volatility",
  mining_margin: "Mining Margin",
  concentration: "Concentration",
  liquidity: "Liquidity",
};

/** Returns a Progress bar color class based on score value. */
function scoreColorClass(score: number, invertedRisk = false): string {
  if (invertedRisk) {
    // higher score = worse (risk score)
    if (score > 70) return "bg-[--ct-status-danger]";
    if (score > 40) return "bg-[--ct-status-warning]";
    return "bg-[--ct-status-success]";
  }
  // higher score = better (mining margin)
  if (score < 30) return "bg-[--ct-status-danger]";
  if (score < 60) return "bg-[--ct-status-warning]";
  return "bg-[--ct-status-success]";
}

/**
 * Parses an assumption string. If it contains `=`, splits on first `=` and
 * returns { key, value }. Otherwise returns the full string as value.
 */
function parseAssumption(line: string): { key: string | null; value: string } {
  const eqIdx = line.indexOf("=");
  if (eqIdx === -1) return { key: null, value: line };
  const key = line.slice(0, eqIdx).trim().replace(/_/g, " ");
  const value = line.slice(eqIdx + 1).trim();
  return { key, value };
}

// ── sub-components ────────────────────────────────────────────────────────────

function AssumptionsList({ assumptions }: { assumptions: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const THRESHOLD = 5;
  const shouldTruncate = assumptions.length > THRESHOLD;
  const visible = shouldTruncate && !expanded
    ? assumptions.slice(0, THRESHOLD)
    : assumptions;

  return (
    <div>
      <ul className="space-y-2">
        {visible.map((line, i) => {
          const { key, value } = parseAssumption(line);
          return (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span
                className="mt-0.5 shrink-0 text-[--text-micro] text-[--ct-text-strong]"
                aria-hidden
              >
                ▸
              </span>
              {key !== null ? (
                <span>
                  <span className="font-semibold text-[--ct-text-body] capitalize">
                    {key}
                  </span>
                  <span className="text-[--ct-text-muted]">: </span>
                  <span className="font-mono text-[--ct-text-body]">
                    {value}
                  </span>
                </span>
              ) : (
                <span className="text-[--ct-text-body]">{value}</span>
              )}
            </li>
          );
        })}
      </ul>
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className={cn(
            "mt-3 text-xs font-semibold text-[--ct-text-strong]",
            "hover:text-[--ct-text-strong] transition-colors duration-150",
          )}
        >
          {expanded
            ? "Show less"
            : `Show ${assumptions.length - THRESHOLD} more`}
        </button>
      )}
    </div>
  );
}

function AllocationBar({
  allocations,
}: {
  allocations: ScenarioOutput["allocations"];
}) {
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full">
      {allocations.map((a) => (
        <div
          key={a.bucket}
          style={{
            width: `${a.pct}%`,
            background: BUCKET_COLOR[a.bucket],
          }}
          title={`${BUCKET_LABEL[a.bucket]}: ${a.pct.toFixed(0)}%`}
        />
      ))}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export function OutputPanel({ output, isPending }: OutputPanelProps) {
  const riskColorClass = scoreColorClass(output.risk_score, true);
  const miningColorClass = scoreColorClass(output.mining_margin_score, false);

  const armedTriggers = output.btc_tactical.triggers.filter((t) => t.armed);

  return (
    <div
      className={cn(
        "relative space-y-4 transition-opacity duration-150",
        isPending && "pointer-events-none opacity-50",
      )}
      aria-busy={isPending}
    >
      {isPending && (
        <div className="pointer-events-none absolute inset-0 z-[--ct-z-overlay] flex items-center justify-center rounded-[--radius-card] bg-[--ct-surface-2]/60 backdrop-blur-sm">
          <span className="text-sm text-[--ct-text-body]">Computing…</span>
        </div>
      )}

      {/* ── Section 1: APY Hero ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Projected APY Range</CardTitle>
          <ProvenanceBadge kind="estimated" />
        </CardHeader>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <ApyRange
            low={output.apy_range.low}
            high={output.apy_range.high}
            className="font-mono text-[--text-5xl] font-black tabular-nums text-[--ct-text-strong] leading-none"
          />
          <div className="flex flex-col items-end gap-1.5">
            <span className="stat-label">Confidence</span>
            <Badge
              variant={CONFIDENCE_VARIANT[output.confidence]}
              className="text-xs"
            >
              {output.confidence.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="mt-4 border-t border-[--ct-border-soft] pt-4">
          <span className="stat-label mr-2">Stressed APY</span>
          <span className="font-mono text-2xl font-black tabular-nums text-[--ct-text-primary]">
            {output.stressed_apy.toFixed(1)}%
          </span>
          <span className="ml-2 text-xs text-[--ct-text-muted]">
            bear scenario floor
          </span>
        </div>
      </Card>

      {/* ── Section 2: PTAI block ────────────────────────────────────────── */}
      <PtaiBlock output={output} />

      {/* ── Section 3: 12-Month NAV Projection ──────────────────────────── */}
      <NavSparkline output={output} />

      {/* ── Section 4: Risk & Mining 2×2 grid ───────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Risk Score */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="stat-label">Risk Score</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black tabular-nums text-[--ct-text-primary]">
              {output.risk_score.toFixed(0)}
            </span>
            <span className="text-sm text-[--ct-text-muted]">/100</span>
          </div>
          <Progress
            value={output.risk_score}
            fillClassName={riskColorClass}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-[--ct-text-muted]">
            Lower = lower risk
          </p>
        </Card>

        {/* Mining Margin Score */}
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="stat-label">Mining Margin</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <div className="mb-1 flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black tabular-nums text-[--ct-text-primary]">
              {output.mining_margin_score.toFixed(0)}
            </span>
            <span className="text-sm text-[--ct-text-muted]">/100</span>
          </div>
          <Progress
            value={output.mining_margin_score}
            fillClassName={miningColorClass}
            className="mt-2"
          />
          <p className="mt-2 text-xs text-[--ct-text-muted]">
            Current vs target
          </p>
        </Card>
      </div>

      {/* ── Section 3: Vault Mode ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="stat-label mb-1">Vault Mode</p>
            <p className="text-xs text-[--ct-text-muted]">
              Current allocation posture
            </p>
          </div>
          <Badge
            variant={MODE_VARIANT[output.mode]}
            className="px-4 py-2 text-sm"
          >
            {MODE_LABEL[output.mode]}
          </Badge>
        </div>
      </Card>

      {/* ── Section 4: Allocation ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Allocation</CardTitle>
          <ProvenanceBadge kind="estimated" />
        </CardHeader>

        {/* Stacked bar */}
        <AllocationBar allocations={output.allocations} />

        {/* Table */}
        <div className="mt-4">
          {/* Header */}
          <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[--text-micro] font-semibold uppercase tracking-widest text-[--ct-text-muted]">
            <span>Bucket</span>
            <span className="text-right">Pct</span>
            <span className="text-right">Yield contribution</span>
          </div>
          {/* Rows */}
          <ul className="divide-y divide-[--ct-border-soft]">
            {output.allocations.map((a) => (
              <li
                key={a.bucket}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-2.5 text-sm first:pt-1 last:pb-1"
              >
                <span className="flex items-center gap-2 text-[--ct-text-body]">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: BUCKET_COLOR[a.bucket] }}
                    aria-hidden
                  />
                  {BUCKET_LABEL[a.bucket]}
                </span>
                <span className="text-right font-mono tabular-nums text-[--ct-text-primary]">
                  {a.pct.toFixed(0)}%
                </span>
                <span className="text-right font-mono tabular-nums text-[--ct-text-muted]">
                  {a.yield_contribution_bps > 0
                    ? `+${a.yield_contribution_bps} bps`
                    : "P&L variable"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* ── Section 5: BTC Tactical ─────────────────────────────────────── */}
      {output.btc_tactical.guardrails.length > 0 && (
        <Card>
          <CardHeader className="mb-4">
            <CardTitle>BTC Tactical</CardTitle>
            <span className="stat-label">
              Target {output.btc_tactical.targetExposurePct.toFixed(0)}%
            </span>
          </CardHeader>

          {/* Guardrails pills */}
          <div className="flex flex-wrap gap-2">
            {output.btc_tactical.guardrails.map((g) => (
              <Badge
                key={g.id}
                variant={GUARDRAIL_STATUS_VARIANT[g.status]}
                title={g.detail}
              >
                {GUARDRAIL_KIND_LABEL[g.kind]}
              </Badge>
            ))}
          </div>

          {/* Armed triggers */}
          {armedTriggers.length > 0 && (
            <div className="mt-4 border-t border-[--ct-border-soft] pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[--ct-text-muted]">
                Armed triggers
              </p>
              <ul className="space-y-1.5">
                {armedTriggers.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className="mt-0.5 shrink-0 text-[--text-micro] text-[--ct-status-warning]"
                      aria-hidden
                    >
                      ▸
                    </span>
                    <span className="text-[--ct-text-body]">
                      {t.condition}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* ── Section 6: Rebalancing Actions ──────────────────────────────── */}
      <RebalancingActions output={output} />

      {/* ── Section 7: Assumptions ──────────────────────────────────────── */}
      <Card>
        <CardHeader className="mb-4">
          <CardTitle>Assumptions</CardTitle>
        </CardHeader>
        <AssumptionsList assumptions={output.assumptions} />
      </Card>

      {/* ── Disclaimer ──────────────────────────────────────────────────── */}
      <p className="border-t border-[--ct-border-soft] pt-4 text-xs italic text-[--ct-text-muted]">
        <span className="font-semibold not-italic text-[--ct-text-body]">
          Not guaranteed.
        </span>{" "}
        Projections are conditional on stated assumptions. Methodology v1.0.
        Past performance does not predict future returns. Forward projections
        are not a promise or commitment to deliver any specific return.
      </p>
    </div>
  );
}
