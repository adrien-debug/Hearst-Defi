import type {
  Allocation,
  AllocationBucket,
  ScenarioInputs,
  VaultMode,
} from "./types";

const DEFENSIVE_RISK_THRESHOLD = 65;
const DEFENSIVE_MARGIN_THRESHOLD = 50;
const OPPORTUNISTIC_RISK_THRESHOLD = 40;
const OPPORTUNISTIC_MARGIN_THRESHOLD = 75;

const BASE_ALLOCATIONS: Record<VaultMode, Record<AllocationBucket, number>> = {
  defensive: {
    mining: 25,
    btc_tactical: 5,
    usdc_base: 55,
    stable_reserve: 15,
  },
  balanced: {
    mining: 35,
    btc_tactical: 15,
    usdc_base: 40,
    stable_reserve: 10,
  },
  opportunistic: {
    mining: 35,
    btc_tactical: 25,
    usdc_base: 30,
    stable_reserve: 10,
  },
};

const RWA_LIKE_USDC_BASE_BPS = 480;
const STABLE_RESERVE_BPS = 450;

export function decideMode(
  riskScore: number,
  marginScore: number,
): VaultMode {
  if (
    riskScore >= DEFENSIVE_RISK_THRESHOLD ||
    marginScore < DEFENSIVE_MARGIN_THRESHOLD
  ) {
    return "defensive";
  }
  if (
    riskScore <= OPPORTUNISTIC_RISK_THRESHOLD &&
    marginScore >= OPPORTUNISTIC_MARGIN_THRESHOLD
  ) {
    return "opportunistic";
  }
  return "balanced";
}

export function deriveAllocations(
  mode: VaultMode,
  inputs: ScenarioInputs,
  miningNetMarginUsdThDay: number,
): Allocation[] {
  const base = BASE_ALLOCATIONS[mode];

  const mining_apy_bps = miningApyBps(miningNetMarginUsdThDay);
  const btc_tactical_bps = btcTacticalBps(inputs);
  const usdc_base_bps = usdcBaseBps(inputs);
  const stable_reserve_bps = STABLE_RESERVE_BPS;

  const contributions: Record<AllocationBucket, number> = {
    mining: mining_apy_bps,
    btc_tactical: btc_tactical_bps,
    usdc_base: usdc_base_bps,
    stable_reserve: stable_reserve_bps,
  };

  const buckets: AllocationBucket[] = [
    "mining",
    "btc_tactical",
    "usdc_base",
    "stable_reserve",
  ];

  return buckets.map((bucket) => ({
    bucket,
    pct: base[bucket],
    yield_contribution_bps: Math.round(
      (base[bucket] / 100) * contributions[bucket],
    ),
  }));
}

function miningApyBps(net_margin_usd_th_day: number): number {
  const annualised_usd = Math.max(0, net_margin_usd_th_day) * 365;
  const invested_usd_per_th = 6;
  const apy = annualised_usd / invested_usd_per_th;
  return Math.round(apy * 10_000);
}

function btcTacticalBps(inputs: ScenarioInputs): number {
  if (inputs.btc_price_change_pct >= 30) return 1800;
  if (inputs.btc_price_change_pct >= 10) return 900;
  if (inputs.btc_price_change_pct <= -25) return -600;
  if (inputs.btc_price_change_pct <= -10) return -200;
  return 200;
}

function usdcBaseBps(inputs: ScenarioInputs): number {
  return Math.round(inputs.stable_apy_pct * 100) + RWA_LIKE_USDC_BASE_BPS - 200;
}
