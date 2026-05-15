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

export interface BtcTrigger {
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
  nextTriggers: BtcTrigger[];
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

export function getDashboardSnapshot(): DashboardSnapshot {
  return {
    asOf: "2026-05-13T08:00:00Z",
    aum: {
      valueUsd: 24_600_000,
      delta30dUsd: 1_200_000,
      provenance: "live",
    },
    currentApyRange: { low: 9.4, high: 12.8 },
    apyProvenance: "live",
    stressedApy: 5.2,
    stressedProvenance: "estimated",
    stressedScenarioLabel: "Bear + Mining Compression",
    riskScore: { value: 42, bandLabel: "Low–Moderate", provenance: "live" },
    nextDistribution: {
      dateLabel: "May 31",
      estimateUsd: 187_000,
      provenance: "estimated",
    },
    allocations: [
      {
        id: "mining",
        label: "Mining cashflow",
        pctAum: 34,
        yieldBps: 620,
        yieldNote: "net of energy + hosting + pool fees",
        provenance: "attested",
      },
      {
        id: "usdc-base",
        label: "USDC base yield",
        pctAum: 38,
        yieldBps: 480,
        yieldNote: "blended Aave / Morpho / Sky",
        provenance: "oracle",
      },
      {
        id: "btc-tactical",
        label: "BTC tactical",
        pctAum: 14,
        yieldBps: 0,
        yieldNote: "P&L variable, rule-driven entries",
        provenance: "live",
      },
      {
        id: "stable-reserve",
        label: "Stable reserve",
        pctAum: 14,
        yieldBps: 450,
        yieldNote: "T-bill-backed (sDAI, Sky USDS)",
        provenance: "oracle",
      },
    ],
    blendedYieldRange: { low: 9.4, high: 12.8 },
    miningHealth: {
      marginScore: 72,
      hashpriceTrendPct: -3.4,
      opConfidence: 81,
      provenance: "attested",
    },
    btcTactical: {
      positionSizePctAum: 14,
      positionSizeUsd: 3_440_000,
      btcHeld: 36.5,
      avgEntry: 58_420,
      currentPrice: 94_180,
      pnlUsd: 840_000,
      pnlPct: 61.3,
      nextTriggers: [
        {
          id: "acc-t1",
          label: "Next accumulate",
          condition: "BTC < $75,344 (−20% from 90d ATH)",
          ruleId: "R-BTC-1",
        },
        {
          id: "tp-t1",
          label: "Next profit-take",
          condition: "BTC > $113,946 (entry × 1.30)",
          ruleId: "R-BTC-3",
        },
      ],
      guardrails: [
        {
          id: "vol",
          label: "Volatility guardrail",
          status: "normal",
          detail: "30d realised vol 42% (threshold 90%)",
        },
        {
          id: "margin",
          label: "Mining margin guardrail",
          status: "healthy",
          detail: "Margin score 72 — accumulation enabled",
        },
      ],
      provenance: "oracle",
    },
    recentEvents: [
      {
        id: "evt-2026-05-11",
        timestamp: "2026-05-11T14:22:00Z",
        ruleId: "R3",
        kind: "rebalance",
        projection:
          "Forward 12m APY range 9.4–12.8% under current mining margin and BTC mid-band assumption.",
        trigger:
          "R3 fired — Mining Margin Score 72 sustained 14d + BTC 30d momentum positive.",
        action:
          "Mining 30% → 34% (+4pp); Stable reserve 18% → 14% (−4pp); BTC tactical unchanged at 14%.",
        impact:
          "APY range 8.9–12.1% → 9.4–12.8%. Stressed APY 5.0% → 5.2%. Distribution estimate +$8.4k/mo.",
      },
      {
        id: "evt-2026-05-01",
        timestamp: "2026-05-01T09:00:00Z",
        ruleId: "R-DIST-1",
        kind: "distribution",
        projection:
          "Monthly USDC distribution from April mining cashflow + base yield accrual.",
        trigger: "Distribution window 2026-04 closed; attestation v1 received.",
        action:
          "Distribute $179,400 USDC pro-rata to LP shares (24,600,000 NAV).",
        impact:
          "Realised APY April = 8.8% annualised. Distribution-to-date $1.04M.",
      },
      {
        id: "evt-2026-04-22",
        timestamp: "2026-04-22T16:45:00Z",
        ruleId: "R4",
        kind: "alert",
        projection:
          "Hashprice 30d avg trending −3.4% vs 60d. Within tolerance band.",
        trigger:
          "R4 watchlist — hashprice change between −5% and 0%, no action threshold.",
        action: "No allocation change. Operational confidence steady at 81.",
        impact:
          "APY range unchanged. Continue monitoring; review trigger at −5%.",
      },
      {
        id: "evt-2026-04-15",
        timestamp: "2026-04-15T11:10:00Z",
        ruleId: "R-BTC-3",
        kind: "rebalance",
        projection:
          "BTC tactical sleeve at 14% AUM, below R-BTC-3 profit-take floor.",
        trigger:
          "R-BTC-3 evaluated — BTC 91,800 vs avg entry 58,420 (ratio 1.57, > 1.30) but sleeve < 10% AUM gate not met.",
        action:
          "No execution. Trigger queued; awaiting sleeve > 10% AUM precondition.",
        impact:
          "BTC tactical exposure preserved. Next evaluation on next price tick + sleeve refresh.",
      },
      {
        id: "evt-2026-04-02",
        timestamp: "2026-04-02T10:00:00Z",
        ruleId: "R-DIST-1",
        kind: "distribution",
        projection:
          "March distribution from mining margin + USDC base + tactical realised P&L.",
        trigger: "Distribution window 2026-03 closed.",
        action: "Distribute $172,800 USDC pro-rata.",
        impact:
          "Realised APY March = 8.6%. NAV per share +0.71% over the month.",
      },
    ],
  };
}
