import type { MiningRevenue, ScenarioInputs } from "./types";

const REFERENCE_EFFICIENCY_KWH_PER_TH_DAY = 0.1;
const HOSTING_AND_POOL_FEE_USD_TH_DAY = 0.005;
const TARGET_NET_MARGIN_USD_TH_DAY = 0.04;
const UPTIME_ASSUMPTION = 0.98;

export function computeMiningRevenue(inputs: ScenarioInputs): MiningRevenue {
  const gross = inputs.hashprice_usd_th_day * UPTIME_ASSUMPTION;
  const energy = inputs.energy_cost_kwh * REFERENCE_EFFICIENCY_KWH_PER_TH_DAY;
  const operating_costs = energy + HOSTING_AND_POOL_FEE_USD_TH_DAY;
  const net = gross - operating_costs;

  // score = 50 + 50 × (current/target − 1), clipped to [0,100] — see 05-mining-model.mdx
  const raw_score = 50 + 50 * (net / TARGET_NET_MARGIN_USD_TH_DAY - 1);
  const margin_score = clip(raw_score, 0, 100);

  return {
    gross_revenue_usd_th_day: round(gross, 6),
    net_margin_usd_th_day: round(net, 6),
    margin_score: round(margin_score, 2),
  };
}

function clip(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
