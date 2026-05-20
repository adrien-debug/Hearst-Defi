import "server-only";

import type { Provenance } from "@/components/ui/provenance-badge";

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
 * Mock dashboard-card shape for a BTC trigger row.
 *
 * NOT the canonical engine type. The source of truth is
 * `BtcTrigger` in `src/lib/engine/types.ts` (kind/condition/action/armed).
 * This shape is intentionally distinct (label/ruleId for display) and lives
 * only in the mock layer.
 */
export interface MockBtcTrigger {
  id: string;
  label: string;
  condition: string;
  ruleId: string;
}

/** @deprecated use the canonical `BtcTrigger` from `@/lib/engine/types`. */
export type BtcTrigger = MockBtcTrigger;

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
  nextTriggers: MockBtcTrigger[];
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
