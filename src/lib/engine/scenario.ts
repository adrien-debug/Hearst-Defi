import { assessBtcTactical } from "./btc-tactical";
import { computeMiningRevenue } from "./mining";
import { decideMode, deriveAllocations } from "./rebalancing";
import { computeRiskScore } from "./risk";
import type {
  Allocation,
  Confidence,
  Preset,
  ScenarioInputs,
  ScenarioOutput,
} from "./types";

export const METHODOLOGY_VERSION = "v1.0";

const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "risk-free",
  "certain",
  "will deliver",
];

const MIN_APY_SPREAD_BPS = 50;
const BEAR_STRESS_FACTOR = 0.65;

const ASSUMPTION_RISK_FACTOR = 0.2;
const ASSUMPTION_UPSIDE_FACTOR = 0.18;

const PRESET_BASELINE_INPUTS: Record<Preset, ScenarioInputs> = {
  base: {
    btc_price_change_pct: 0,
    hashprice_usd_th_day: 0.085,
    energy_cost_kwh: 0.045,
    stable_apy_pct: 4.5,
    vol_index: 45,
  },
  btc_bear: {
    btc_price_change_pct: -40,
    hashprice_usd_th_day: 0.06,
    energy_cost_kwh: 0.047,
    stable_apy_pct: 4.5,
    vol_index: 60,
  },
  btc_bull: {
    btc_price_change_pct: 60,
    hashprice_usd_th_day: 0.102,
    energy_cost_kwh: 0.045,
    stable_apy_pct: 4.5,
    vol_index: 35,
  },
  mining_compression: {
    btc_price_change_pct: 0,
    hashprice_usd_th_day: 0.064,
    energy_cost_kwh: 0.052,
    stable_apy_pct: 4.5,
    vol_index: 55,
  },
  extreme_stress: {
    btc_price_change_pct: -50,
    hashprice_usd_th_day: 0.051,
    energy_cost_kwh: 0.05,
    stable_apy_pct: 3.8,
    vol_index: 85,
  },
};

export interface RunScenarioOpts {
  preset?: Preset;
  now?: Date;
}

export function getPresetInputs(preset: Preset): ScenarioInputs {
  return { ...PRESET_BASELINE_INPUTS[preset] };
}

export function runScenario(
  inputs: ScenarioInputs,
  opts: RunScenarioOpts = {},
): ScenarioOutput {
  const now = opts.now ?? new Date(0);

  const mining = computeMiningRevenue(inputs);
  const risk_score = computeRiskScore(inputs);
  const mode = decideMode(risk_score, mining.margin_score);
  const allocations = deriveAllocations(
    mode,
    inputs,
    mining.net_margin_usd_th_day,
  );

  const projected_apy_pct = projectedApyPct(allocations);
  const apy_range = buildApyRange(projected_apy_pct);
  const stressed_apy = round(apy_range.low * BEAR_STRESS_FACTOR, 2);
  const confidence = deriveConfidence(inputs, apy_range);

  const assumptions = buildAssumptions(inputs, mode, now, opts.preset);
  assertNoForbiddenWords(assumptions);

  const btc_tactical = assessBtcTactical(inputs, mode);

  return {
    apy_range,
    stressed_apy,
    risk_score: round(risk_score, 2),
    mining_margin_score: round(mining.margin_score, 2),
    mode,
    allocations,
    assumptions,
    confidence,
    btc_tactical,
  };
}

function projectedApyPct(allocations: Allocation[]): number {
  const total_bps = allocations.reduce(
    (acc, a) => acc + a.yield_contribution_bps,
    0,
  );
  return total_bps / 100;
}

function buildApyRange(projected_apy_pct: number): {
  low: number;
  high: number;
} {
  const center = Math.max(0, projected_apy_pct);
  const low_raw = center * (1 - ASSUMPTION_RISK_FACTOR);
  const high_raw = center * (1 + ASSUMPTION_UPSIDE_FACTOR);

  let low = round(low_raw, 2);
  let high = round(high_raw, 2);

  const min_spread_pct = MIN_APY_SPREAD_BPS / 100;
  if (high - low < min_spread_pct) {
    high = round(low + min_spread_pct, 2);
  }
  return { low, high };
}

function deriveConfidence(
  inputs: ScenarioInputs,
  apy_range: { low: number; high: number },
): Confidence {
  const spread = apy_range.high - apy_range.low;
  const vol = inputs.vol_index;

  if (vol >= 75) return "low";
  if (vol >= 50 || spread > 4) return "medium";
  return "high";
}

function buildAssumptions(
  inputs: ScenarioInputs,
  mode: string,
  now: Date,
  preset: Preset | undefined,
): string[] {
  const timestamp = now.toISOString();
  const presetLabel = preset ?? "custom";

  return [
    `methodology_version=${METHODOLOGY_VERSION}`,
    `preset=${presetLabel}; vault_mode=${mode}; generated_at=${timestamp}`,
    `hashprice=${inputs.hashprice_usd_th_day} USD/TH/day, energy=${inputs.energy_cost_kwh} USD/kWh, uptime=98% (paper phase)`,
    `btc_price_change_30d=${inputs.btc_price_change_pct}%, vol_index=${inputs.vol_index}, stable_base_apy=${inputs.stable_apy_pct}%`,
    "Outputs are projections, not guaranteed. Past performance does not predict future results.",
  ];
}

function assertNoForbiddenWords(assumptions: string[]): void {
  for (const line of assumptions) {
    const lower = line.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (word === "guarantee" && lower.includes("not guaranteed")) continue;
      if (lower.includes(word)) {
        throw new Error(`forbidden word "${word}" in assumption: ${line}`);
      }
    }
  }
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}
