import type { Provenance } from "@/components/ui/provenance-badge";

/**
 * Dashboard view-model types.
 *
 * Presentation-layer shapes for the dashboard cards (AUM, APY range, mining
 * health, BTC tactical, activity). These are display contracts, distinct from
 * the canonical engine types in `src/lib/engine/types.ts`. Pure types — no
 * runtime, safe to import from server or client components.
 */

export interface ApyRange {
  low: number;
  high: number;
}

export interface AllocationBucket {
  id: "mining" | "btc-tactical" | "usdc-base" | "stable-reserve";
  label: string;
  pctAum: number;
  yieldBps: number;
  yieldNote: string;
  provenance: Provenance;
}

export interface MiningHealth {
  marginScore: number;
  hashpriceTrendPct: number;
  opConfidence: number;
  provenance: Provenance;
}

/**
 * Dashboard-card shape for a BTC trigger row.
 *
 * NOT the canonical engine type. The source of truth is
 * `BtcTrigger` in `src/lib/engine/types.ts` (kind/condition/action/armed).
 * This shape is intentionally distinct (label/ruleId for display) and is
 * used by the dashboard presentation layer only.
 */
export interface DisplayBtcTrigger {
  id: string;
  label: string;
  condition: string;
  ruleId: string;
}

export interface BtcGuardrail {
  id: string;
  label: string;
  status: "healthy" | "normal" | "warning" | "breached";
  detail: string;
}

export interface BtcTactical {
  positionSizePctAum: number;
  positionSizeUsd: number;
  btcHeld: number;
  avgEntry: number;
  currentPrice: number;
  pnlUsd: number;
  pnlPct: number;
  nextTriggers: DisplayBtcTrigger[];
  guardrails: BtcGuardrail[];
  provenance: Provenance;
}

export interface PtaiEvent {
  id: string;
  timestamp: string;
  ruleId: string;
  kind: "rebalance" | "distribution" | "alert";
  projection: string;
  trigger: string;
  action: string;
  impact: string;
}

export interface DashboardSnapshot {
  asOf: string;
  aum: {
    valueUsd: number;
    delta30dUsd: number;
    provenance: Provenance;
  };
  currentApyRange: ApyRange;
  apyProvenance: Provenance;
  stressedApy: number;
  stressedProvenance: Provenance;
  stressedScenarioLabel: string;
  riskScore: { value: number; bandLabel: string; provenance: Provenance };
  nextDistribution: {
    dateLabel: string;
    estimateUsd: number;
    provenance: Provenance;
  };
  allocations: AllocationBucket[];
  blendedYieldRange: ApyRange;
  miningHealth: MiningHealth;
  btcTactical: BtcTactical;
  recentEvents: PtaiEvent[];
}
