"use client";

import { ApyRange } from "@/components/ui/apy-range";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Metric } from "@/components/ui/metric";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";
import type { AllocationBucket, ScenarioOutput } from "@/lib/engine/types";

interface OutputPanelProps {
  output: ScenarioOutput;
  isPending: boolean;
}

const BUCKET_LABEL: Record<AllocationBucket, string> = {
  mining: "Mining cashflow",
  btc_tactical: "BTC tactical",
  usdc_base: "USDC base yield",
  stable_reserve: "Stable reserve",
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

export function OutputPanel({ output, isPending }: OutputPanelProps) {
  return (
    <div
      className={cn(
        "space-y-5 transition-opacity duration-150",
        isPending && "opacity-50 pointer-events-none",
      )}
      aria-busy={isPending}
    >
      {isPending && (
        <p className="stat-label text-center py-1">Computing…</p>
      )}

      {/* APY range — hero */}
      <Card>
        <CardHeader>
          <CardTitle>Projected APY range</CardTitle>
          <ProvenanceBadge kind="estimated" />
        </CardHeader>
        <div className="flex items-end justify-between gap-4">
          <ApyRange
            low={output.apy_range.low}
            high={output.apy_range.high}
            className="stat-value"
          />
          <div className="flex items-center gap-2">
            <span className="stat-label">Confidence</span>
            <Badge variant={CONFIDENCE_VARIANT[output.confidence]}>
              {output.confidence.toUpperCase()}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2-col score row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          label="Stressed APY"
          value={`${output.stressed_apy.toFixed(1)}%`}
          sublabel="bear scenario floor"
          provenance="estimated"
          tooltip="Projected APY under stressed conditions. Conditional, not guaranteed."
        />
        <Metric
          label="Risk Score"
          value={`${output.risk_score.toFixed(0)}/100`}
          sublabel="lower = lower risk"
          provenance="estimated"
          tooltip="Composite score across market, mining, liquidity, smart contract, counterparty risk."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          label="Mining Margin Score"
          value={`${output.mining_margin_score.toFixed(0)}/100`}
          sublabel="current vs target"
          provenance="estimated"
        />
        <Card>
          <CardHeader>
            <CardTitle>Vault mode</CardTitle>
          </CardHeader>
          <div>
            <Badge variant={MODE_VARIANT[output.mode]}>
              {MODE_LABEL[output.mode]}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Allocations */}
      <Card>
        <CardHeader>
          <CardTitle>Allocation</CardTitle>
          <ProvenanceBadge kind="estimated" />
        </CardHeader>
        <ul className="divide-y divide-[--color-border-subtle]">
          {output.allocations.map((a) => (
            <li
              key={a.bucket}
              className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-sm text-[--color-text-muted]">
                {BUCKET_LABEL[a.bucket]}
              </span>
              <div className="flex items-center gap-4 font-mono text-sm tabular-nums">
                <span>{a.pct.toFixed(0)}%</span>
                <span className="text-[--color-text-dim]">
                  {a.yield_contribution_bps > 0
                    ? `+${a.yield_contribution_bps} bps`
                    : "P&L variable"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle>Assumptions</CardTitle>
        </CardHeader>
        <ul className="space-y-1.5">
          {output.assumptions.map((line, i) => (
            <li
              key={i}
              className="font-mono text-xs text-[--color-text-muted] break-all"
            >
              {line}
            </li>
          ))}
        </ul>
      </Card>

      {/* Disclaimer — always visible, never behind a toggle */}
      <p className="rounded-[--radius-button] border border-[--color-border-subtle] bg-[--color-bg-elevated] px-4 py-3 text-xs text-[--color-text-dim]">
        <span className="font-medium text-[--color-text-muted]">
          Not guaranteed.
        </span>{" "}
        Projections are conditional on stated assumptions. Methodology v1.0.
        Past performance does not predict future returns. Forward projections
        are not a promise or commitment to deliver any specific return.
      </p>
    </div>
  );
}
