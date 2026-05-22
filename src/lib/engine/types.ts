export interface ScenarioInputs {
  btc_price_change_pct: number;
  hashprice_usd_th_day: number;
  energy_cost_kwh: number;
  stable_apy_pct: number;
  vol_index: number; // 0-100, BTC 30d volatility index
}

export type AllocationBucket =
  | "mining"
  | "btc_tactical"
  | "usdc_base"
  | "stable_reserve";

export interface Allocation {
  bucket: AllocationBucket;
  pct: number;
  yield_contribution_bps: number;
}

export type VaultMode = "defensive" | "balanced" | "opportunistic";

// First-class vault identity (ADR-006 lifts the single-vault MVP lock).
export type VaultId = "yield" | "defensive" | "btc-plus";

export type Confidence = "low" | "medium" | "high";

export interface ScenarioOutput {
  apy_range: { low: number; high: number };
  stressed_apy: number;
  risk_score: number;
  mining_margin_score: number;
  mode: VaultMode;
  allocations: Allocation[];
  assumptions: string[];
  confidence: Confidence;
  btc_tactical: BtcTacticalAssessment;
}

export type BtcTriggerKind = "accumulate" | "take_profit" | "reduce_size" | "hold";

export interface BtcTrigger {
  id: string;
  kind: BtcTriggerKind;
  condition: string;
  action: string;
  armed: boolean;
}

export type BtcGuardrailKind =
  | "volatility"
  | "mining_margin"
  | "concentration"
  | "liquidity";

export interface BtcGuardrail {
  id: string;
  kind: BtcGuardrailKind;
  label: string;
  status: "healthy" | "normal" | "warning" | "breached";
  detail: string;
}

export interface BtcTacticalAssessment {
  triggers: BtcTrigger[];
  guardrails: BtcGuardrail[];
  targetExposurePct: number;
}

export type Preset =
  | "base"
  | "btc_bear"
  | "btc_bull"
  | "mining_compression"
  | "extreme_stress";

export interface MiningRevenue {
  gross_revenue_usd_th_day: number;
  net_margin_usd_th_day: number;
  margin_score: number;
}

export type BacktestKey = "bear_2022" | "etf_halving_2024" | "mining_crunch_2024";

// ─── Scenario Engine v2 contract (ui-dev coding against this) ──────────────

export type ScenarioParams = {
  btcPriceUsd: number;
  networkHashrateEh: number;
  hashpricePer100Th: number;
  miningYieldPct: number;
  allocationWeights: {
    mining: number;
    btcTactical: number;
    usdcBase: number;
    stableReserve: number;
  };
  durationMonths: number;
  riskFreeRate: number;
};

export type MonthlyReturn = {
  month: number;
  nav: number;
  return: number;
  miningContrib: number;
  btcContrib: number;
  usdcContrib: number;
};

export type ScenarioResult = {
  params: ScenarioParams;
  monthly: MonthlyReturn[];
  apyLow: number;
  apyHigh: number;
  apyMedian: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  var95: number;
  stressedApy: number;
  assumptions: string[];
  disclaimer: string;
};

export type ScenarioDelta = {
  apyMedian: number;
  maxDrawdown: number;
  sharpe: number;
  var95: number;
};

export interface MonthlyPoint {
  month: string;
  valueUsdc: number;
  distributionUsdc: number;
}

export interface BacktestOutput {
  key: BacktestKey;
  startDate: string;
  endDate: string;
  initialCapital: number;
  endingValue: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  worstMonthPct: number;
  numRebalances: number;
  monthlySeries: MonthlyPoint[];
  hearstRulesMode: boolean;
  assumptions: string[];
}

// NOTE: StatusVariant / BadgeVariant / Tone / PillTone sont des alias sémantiques
// qui devraient être unifiés dans une future refactor. Voir audit #3.
