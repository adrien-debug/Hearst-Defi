import type { ScenarioInputs } from "./types";

const W_MARKET = 0.3;
const W_MINING = 0.25;
const W_LIQUIDITY = 0.15;
const W_SMART_CONTRACT = 0.2;
const W_COUNTERPARTY = 0.1;

const VOL_INDEX_LOW = 1;
const VOL_INDEX_HIGH = 3;

const SMART_CONTRACT_BASELINE_PRE_AUDIT = 80;

const COUNTERPARTY_BASELINE = 35;

export interface RiskBreakdown {
  market: number;
  mining: number;
  liquidity: number;
  smart_contract: number;
  counterparty: number;
  composite: number;
}

export function computeRiskBreakdown(inputs: ScenarioInputs): RiskBreakdown {
  const market = scoreMarket(inputs);
  const mining = scoreMining(inputs);
  const liquidity = scoreLiquidity(inputs);
  const smart_contract = SMART_CONTRACT_BASELINE_PRE_AUDIT;
  const counterparty = COUNTERPARTY_BASELINE;

  const composite =
    W_MARKET * market +
    W_MINING * mining +
    W_LIQUIDITY * liquidity +
    W_SMART_CONTRACT * smart_contract +
    W_COUNTERPARTY * counterparty;

  return {
    market: round(market, 2),
    mining: round(mining, 2),
    liquidity: round(liquidity, 2),
    smart_contract: round(smart_contract, 2),
    counterparty: round(counterparty, 2),
    composite: round(clip(composite, 1, 100), 2),
  };
}

export function computeRiskScore(inputs: ScenarioInputs): number {
  return computeRiskBreakdown(inputs).composite;
}

function scoreMarket(inputs: ScenarioInputs): number {
  const drawdown_component = Math.max(0, -inputs.btc_price_change_pct) * 1.2;
  const upside_component = Math.max(0, inputs.btc_price_change_pct) * 0.3;
  const vol_component = normaliseVol(inputs.vol_index) * 40;
  return clip(20 + drawdown_component + upside_component + vol_component, 1, 100);
}

function scoreMining(inputs: ScenarioInputs): number {
  const hashprice_pressure = clip(
    (0.085 - inputs.hashprice_usd_th_day) * 600,
    -30,
    60,
  );
  const energy_pressure = clip((inputs.energy_cost_kwh - 0.045) * 800, -10, 50);
  return clip(30 + hashprice_pressure + energy_pressure, 1, 100);
}

function scoreLiquidity(inputs: ScenarioInputs): number {
  const vol_factor = normaliseVol(inputs.vol_index) * 25;
  const stable_factor = clip((5 - inputs.stable_apy_pct) * 3, -5, 15);
  return clip(30 + vol_factor + stable_factor, 1, 100);
}

function normaliseVol(vol: number): number {
  if (vol <= VOL_INDEX_LOW) return 0;
  if (vol >= VOL_INDEX_HIGH) return 1;
  return (vol - VOL_INDEX_LOW) / (VOL_INDEX_HIGH - VOL_INDEX_LOW);
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
