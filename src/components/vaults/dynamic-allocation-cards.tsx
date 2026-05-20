// Data derived from docs/methodology/v1.0.md — Bull / Sideways / Bear regimes.
// Pure display component, no I/O, no engine calls.
// APY shown as range (#1). Provenance badge on each card (#2).
// No forbidden words (#5): no "guarantee", "promise", "certain", "risk-free".

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";
import { cn } from "@/lib/cn";

interface RegimeCard {
  id: "bull" | "sideways" | "bear";
  label: string;
  icon: string;
  scenario: string;
  pitch: string;
  // Allocation adjustments vs. base
  miningPct: number;
  btcTacticalPct: number;
  usdcBasePct: number;
  stableReservePct: number;
  // Expected APY range in this regime
  apyLow: number;
  apyHigh: number;
  tone: "success" | "warning" | "danger";
}

// Derived directly from methodology v1.0 regime assumptions:
// Bull: hashprice up, BTC up → lean into mining + BTC tactical.
// Sideways: base-case balanced → default 60/25/10/5 allocation.
// Bear: hashprice –30%, BTC –40% → rotate out, fortify stable + USDC base.
const REGIME_CARDS: RegimeCard[] = [
  {
    id: "bull",
    label: "Bull",
    icon: "↑",
    scenario:
      "BTC price appreciation + hashprice above long-run average. Mining margins expand; BTC tactical sleeve contributes positive delta.",
    pitch:
      "In constructive market conditions, the rule engine increases mining sleeve weight and expands BTC tactical exposure within the risk budget — capturing upside while the base continues to distribute USDC monthly.",
    miningPct: 65,
    btcTacticalPct: 28,
    usdcBasePct: 5,
    stableReservePct: 2,
    apyLow: 11.2,
    apyHigh: 15.0,
    tone: "success",
  },
  {
    id: "sideways",
    label: "Sideways",
    icon: "→",
    scenario:
      "BTC consolidation phase. Hashprice tracks historical median. Mining cashflows steady; BTC tactical sleeve held for delta at reduced weight.",
    pitch:
      "The base-case balanced allocation preserves monthly USDC distributions from mining cashflows while keeping BTC tactical exposure within the volatility guardrail (≤ 35v). Stable reserve provides the 60-day soft lock-up buffer.",
    miningPct: 60,
    btcTacticalPct: 25,
    usdcBasePct: 10,
    stableReservePct: 5,
    apyLow: 9.4,
    apyHigh: 12.8,
    tone: "warning",
  },
  {
    id: "bear",
    label: "Bear",
    icon: "↓",
    scenario:
      "Stressed scenario: BTC −40%, hashprice −30%, mining margin compression. Combined stress test from Methodology v1.0.",
    pitch:
      "Under stress, the rule engine rotates toward USDC base and stable reserve, reducing mining and BTC tactical sleeves. Monthly distributions continue from USDC lending yield; the fund targets capital preservation over return maximisation.",
    miningPct: 45,
    btcTacticalPct: 10,
    usdcBasePct: 28,
    stableReservePct: 17,
    apyLow: 4.8,
    apyHigh: 7.2,
    tone: "danger",
  },
];


const TONE_CLASSES: Record<
  "success" | "warning" | "danger",
  { border: string; badge: string; text: string }
> = {
  success: {
    border: "border-[--ct-status-success-border]",
    badge: "ct-status-success",
    text: "ct-status-success",
  },
  warning: {
    border: "border-[--ct-border]",
    badge: "ct-text-primary",
    text: "ct-text-primary",
  },
  danger: {
    border: "border-[--ct-status-danger-border]",
    badge: "ct-status-danger",
    text: "ct-status-danger",
  },
};

interface AllocationBarProps {
  label: string;
  pct: number;
  tone: "success" | "warning" | "danger";
}

function AllocationBar({ label, pct, tone }: AllocationBarProps) {
  const barColor =
    tone === "success"
      ? "bg-[--ct-status-success]"
      : tone === "danger"
        ? "bg-[--ct-status-danger]"
        : "bg-[--ct-accent]";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="body-xs ct-text-muted w-20 shrink-0">{label}</span>
      <Progress
        value={pct}
        className="flex-1"
        fillClassName={barColor}
        label={`${label}: ${pct}%`}
      />
      <span className="body-xs tabular ct-text-body w-8 text-right shrink-0">
        {pct}%
      </span>
    </div>
  );
}

/**
 * 3-card regime display for the term sheet.
 * Derived from methodology v1.0 Bull/Sideways/Bear presets.
 * No engine calls — pure static data.
 */
export function DynamicAllocationCards() {
  return (
    <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(var(--ct-regime-card-min-w),1fr))]">
      {REGIME_CARDS.map((card) => {
        const toneClass = TONE_CLASSES[card.tone];
        return (
          <Card
            key={card.id}
            className={cn("flex flex-col gap-4 border", toneClass.border)}
            aria-label={`${card.label} regime allocation`}
          >
            {/* Regime header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={cn("stat-value tabular", toneClass.text)}
                  aria-hidden="true"
                >
                  {card.icon}
                </span>
                <h3 className="h4">{card.label} Regime</h3>
              </div>
              <ProvenanceBadge kind="estimated" />
            </div>

            {/* APY range in this regime (#1 — always range) */}
            <div className="flex flex-col gap-0.5">
              <span className="stat-label">Expected APY range</span>
              <span
                className={cn(
                  "mono tabular-nums font-semibold text-lg",
                  toneClass.text,
                )}
                aria-label={`APY range ${card.apyLow} to ${card.apyHigh} percent`}
              >
                {card.apyLow.toFixed(1)}
                <span className="mx-1 ct-text-muted font-sans font-normal text-sm">
                  —
                </span>
                {card.apyHigh.toFixed(1)}
                <span className="ml-0.5 opacity-80 text-base">
                  %
                </span>
              </span>
              <p className="body-xs ct-text-muted">
                Conditional on scenario — not a projection
              </p>
            </div>

            {/* Scenario description */}
            <p className="body-sm ct-text-body">{card.scenario}</p>

            {/* Allocation bars */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[--ct-border-soft]">
              <span className="stat-label">Target allocation</span>
              <AllocationBar
                label="Mining"
                pct={card.miningPct}
                tone={card.tone}
              />
              <AllocationBar
                label="BTC Tactical"
                pct={card.btcTacticalPct}
                tone={card.tone}
              />
              <AllocationBar
                label="USDC Base"
                pct={card.usdcBasePct}
                tone={card.tone}
              />
              <AllocationBar
                label="Stable Res."
                pct={card.stableReservePct}
                tone={card.tone}
              />
            </div>

            {/* Strategy pitch */}
            <p className="body-xs ct-text-muted border-t border-[--ct-border-soft] pt-2">
              {card.pitch}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

