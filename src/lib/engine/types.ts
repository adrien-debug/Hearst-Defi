export interface ScenarioInputs {
  btc_price_change_pct: number;
  hashprice_usd_th_day: number;
  energy_cost_kwh: number;
  stable_apy_pct: number;
  vol_index: number;
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
