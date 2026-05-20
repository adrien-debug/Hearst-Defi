"use client";

import { useState } from "react";

import { Markdown } from "@/components/admin/markdown";
import { NavSparkline } from "@/components/scenario/nav-sparkline";
import { PtaiBlock } from "@/components/scenario/ptai-block";
import { RebalancingActions } from "@/components/scenario/rebalancing-actions";
import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import {
  BUCKET_COLOR,
  BUCKET_LABEL,
  CONFIDENCE_VARIANT,
  progressScoreFillClass,
} from "@/components/scenario/output-panel-shared";
import type { ScenarioNarrativeOutput } from "@/lib/agents/schemas";
import type {
  AllocationBucket,
  BtcGuardrail,
  BtcGuardrailKind,
  ScenarioOutput,
} from "@/lib/engine/types";

interface OutputPanelProps {
  output: ScenarioOutput;
  isPending: boolean;
  /**
   * AI-generated narrative from the Scenario Narrative agent (Sonnet 4.6).
   * `null` means the agent failed (timeout, forbidden-words filter, schema fail)
   * and we degrade gracefully by surfacing a discreet note instead of hiding
   * the missing section.
   */
  narrative?: ScenarioNarrativeOutput | null;
}

// ── helpers ──────────────────────────────────────────────────────────────────

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
                className="mt-0.5 shrink-0 text-micro text-[--ct-text-strong]"
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
                  <span className="mono text-[--ct-text-body]">
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((x) => !x)}
          className="mt-3 text-[--ct-text-strong] hover:text-[--ct-text-strong]"
        >
          {expanded
            ? "Show less"
            : `Show ${assumptions.length - THRESHOLD} more`}
        </Button>
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
          className="h-full bg-current"
          style={{
            width: `${a.pct}%`,
            color: BUCKET_COLOR[a.bucket],
          }}
          title={`${BUCKET_LABEL[a.bucket]}: ${a.pct.toFixed(0)}%`}
        />
      ))}
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────

export function OutputPanel({ output, isPending, narrative }: OutputPanelProps) {
  const riskColorClass = progressScoreFillClass(output.risk_score, true);
  const miningColorClass = progressScoreFillClass(output.mining_margin_score, false);

  const armedTriggers = output.btc_tactical.triggers.filter((t) => t.armed);

  return (
    <div
      className={cn(
        "relative space-y-4 transition-opacity duration-[var(--ct-dur-fast)]",
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
            className="mono text-5xl font-extrabold tabular-nums text-[--ct-text-strong] leading-none"
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
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="stat-label">Stressed APY</span>
            <ProvenanceBadge kind="estimated" />
          </div>
          <span className="mono text-2xl font-extrabold tabular-nums text-[--ct-text-primary]">
            {output.stressed_apy.toFixed(1)}%
          </span>
          <span className="ml-2 text-xs text-[--ct-text-muted]">
            bear scenario floor
          </span>
        </div>
      </Card>

      {/* ── Section 2: PTAI block ────────────────────────────────────────── */}
      <PtaiBlock output={output} />

      {/* ── Section 2.5: AI Narrative (Sonnet 4.6) ───────────────────────── */}
      {narrative !== undefined ? (
        narrative !== null ? (
          <Card>
            <CardHeader className="mb-3">
              <CardTitle>Narrative</CardTitle>
              <ProvenanceBadge kind="estimated" />
            </CardHeader>
            <Markdown content={narrative.narrative_md} />
            {narrative.risk_warning ? (
              <div className="mt-4 rounded-[--radius-button] border border-[--ct-status-warning] bg-[--ct-status-warning-soft] px-4 py-3">
                <p className="stat-label mb-1 text-[--ct-status-warning]">
                  Risk warning
                </p>
                <p className="text-sm text-[--ct-text-body]">
                  {narrative.risk_warning}
                </p>
              </div>
            ) : null}
          </Card>
        ) : (
          <Card>
            <div className="flex items-center gap-3">
              <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[--ct-status-warning]" aria-hidden />
              <p className="text-xs text-[--ct-text-muted]">
                AI narrative unavailable — engine output shown above.
              </p>
            </div>
          </Card>
        )
      ) : null}

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
            <span className="mono text-2xl font-extrabold tabular-nums text-[--ct-text-primary]">
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
            <span className="mono text-2xl font-extrabold tabular-nums text-[--ct-text-primary]">
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
          <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-x-4 text-micro font-semibold uppercase tracking-wide text-[--ct-text-muted]">
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
                    className="inline-block h-2 w-2 shrink-0 rounded-full shadow-[var(--ct-glow-dot)] bg-current"
                    style={{ color: BUCKET_COLOR[a.bucket] }}
                    aria-hidden
                  />
                  {BUCKET_LABEL[a.bucket]}
                </span>
                <span className="text-right mono tabular-nums text-[--ct-text-primary]">
                  {a.pct.toFixed(0)}%
                </span>
                <span className="text-right mono tabular-nums text-[--ct-text-muted]">
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
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[--ct-text-muted]">
                Armed triggers
              </p>
              <ul className="space-y-1.5">
                {armedTriggers.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span
                      className="mt-0.5 shrink-0 text-micro text-[--ct-status-warning]"
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
        Forward projections are conditional on the stated assumptions and are
        not guaranteed. Past performance does not predict future results.
      </p>
    </div>
  );
}
