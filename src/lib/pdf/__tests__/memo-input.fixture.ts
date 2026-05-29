import "server-only";

// Test fixture: a representative `InvestorMemoInput` used by the investor-memo
// PDF template snapshot test. The production input is assembled by the
// Prisma-backed loaders in `src/lib/agents/loaders/*`; this fixture exists
// solely to exercise the PDF rendering layer deterministically. Keep the shape
// aligned with InvestorMemoInput (src/lib/agents/investor-memo.ts).

import type { InvestorMemoInput } from "@/lib/agents/investor-memo";
import type {
  BacktestOutput,
  BtcTacticalAssessment,
  ScenarioOutput,
} from "@/lib/engine/types";

const btcAssessment: BtcTacticalAssessment = {
  targetExposurePct: 14,
  triggers: [
    {
      id: "acc-t1",
      kind: "accumulate",
      condition: "BTC < $75,344 (−20% from 90d ATH)",
      action: "convert 5% AUM USDC → BTC (R-BTC-1)",
      armed: true,
    },
    {
      id: "tp-t1",
      kind: "take_profit",
      condition: "BTC > $113,946 (entry × 1.30)",
      action: "sell 25% of BTC tactical sleeve (R-BTC-3)",
      armed: true,
    },
  ],
  guardrails: [
    {
      id: "vol-guard",
      kind: "volatility",
      label: "Volatility guardrail",
      status: "normal",
      detail: "30d realised vol 42% (threshold 90%)",
    },
    {
      id: "margin-guard",
      kind: "mining_margin",
      label: "Mining margin guardrail",
      status: "healthy",
      detail: "Margin score 72 — accumulation enabled",
    },
  ],
};

const baseScenario: ScenarioOutput = {
  apy_range: { low: 9.4, high: 12.8 },
  stressed_apy: 6.1,
  risk_score: 42,
  mining_margin_score: 72,
  mode: "balanced",
  confidence: "medium",
  allocations: [
    { bucket: "mining", pct: 34, yield_contribution_bps: 620 },
    { bucket: "usdc_base", pct: 38, yield_contribution_bps: 480 },
    { bucket: "btc_tactical", pct: 14, yield_contribution_bps: 0 },
    { bucket: "stable_reserve", pct: 14, yield_contribution_bps: 450 },
  ],
  assumptions: [
    "methodology_version=v1.0",
    "preset=base; vault_mode=balanced; uptime=98% (paper phase)",
    "hashprice=0.085 USD/TH/day, energy=0.045 USD/kWh",
    "btc_price_change_30d=0%, vol_index=2.0, stable_base_apy=4.5%",
    "Outputs are projections, not guaranteed. Past performance does not predict future results.",
  ],
  btc_tactical: btcAssessment,
};

const bearScenario: ScenarioOutput = {
  apy_range: { low: 5.2, high: 7.6 },
  stressed_apy: 3.4,
  risk_score: 58,
  mining_margin_score: 51,
  mode: "defensive",
  confidence: "medium",
  allocations: [
    { bucket: "mining", pct: 24, yield_contribution_bps: 380 },
    { bucket: "usdc_base", pct: 42, yield_contribution_bps: 510 },
    { bucket: "btc_tactical", pct: 9, yield_contribution_bps: 0 },
    { bucket: "stable_reserve", pct: 25, yield_contribution_bps: 470 },
  ],
  assumptions: [
    "methodology_version=v1.0",
    "preset=btc_bear; vault_mode=defensive",
    "hashprice=0.060 USD/TH/day, energy=0.047 USD/kWh, uptime=97%",
    "btc_price_change_30d=-40%, vol_index=2.5, stable_base_apy=4.5%",
    "Outputs are projections, not guaranteed.",
  ],
  btc_tactical: btcAssessment,
};

const miningCompression: ScenarioOutput = {
  apy_range: { low: 6.4, high: 9.1 },
  stressed_apy: 4.0,
  risk_score: 53,
  mining_margin_score: 47,
  mode: "defensive",
  confidence: "medium",
  allocations: [
    { bucket: "mining", pct: 22, yield_contribution_bps: 300 },
    { bucket: "usdc_base", pct: 45, yield_contribution_bps: 525 },
    { bucket: "btc_tactical", pct: 11, yield_contribution_bps: 0 },
    { bucket: "stable_reserve", pct: 22, yield_contribution_bps: 410 },
  ],
  assumptions: [
    "methodology_version=v1.0",
    "preset=mining_compression; vault_mode=defensive",
    "difficulty+30%, hashprice=0.064 USD/TH/day, energy=0.052 USD/kWh",
    "btc_price_change_30d=0%, vol_index=2.0",
    "Outputs are projections, not guaranteed.",
  ],
  btc_tactical: btcAssessment,
};

const bullScenario: ScenarioOutput = {
  apy_range: { low: 11.6, high: 15.2 },
  stressed_apy: 7.8,
  risk_score: 38,
  mining_margin_score: 81,
  mode: "opportunistic",
  confidence: "high",
  allocations: [
    { bucket: "mining", pct: 38, yield_contribution_bps: 740 },
    { bucket: "usdc_base", pct: 30, yield_contribution_bps: 410 },
    { bucket: "btc_tactical", pct: 24, yield_contribution_bps: 0 },
    { bucket: "stable_reserve", pct: 8, yield_contribution_bps: 360 },
  ],
  assumptions: [
    "methodology_version=v1.0",
    "preset=btc_bull; vault_mode=opportunistic",
    "hashprice=0.102 USD/TH/day, energy=0.045 USD/kWh",
    "btc_price_change_30d=+60%, vol_index=3.0, stable_base_apy=4.5%",
    "Outputs are projections, not guaranteed.",
  ],
  btc_tactical: btcAssessment,
};

const extremeStress: ScenarioOutput = {
  apy_range: { low: 2.1, high: 4.3 },
  stressed_apy: 1.2,
  risk_score: 71,
  mining_margin_score: 38,
  mode: "defensive",
  confidence: "low",
  allocations: [
    { bucket: "mining", pct: 18, yield_contribution_bps: 220 },
    { bucket: "usdc_base", pct: 40, yield_contribution_bps: 460 },
    { bucket: "btc_tactical", pct: 6, yield_contribution_bps: 0 },
    { bucket: "stable_reserve", pct: 36, yield_contribution_bps: 540 },
  ],
  assumptions: [
    "methodology_version=v1.0",
    "preset=extreme_stress; vault_mode=defensive",
    "BTC −50%, hashprice=0.051 USD/TH/day, DeFi shock active",
    "stablecoin depeg episode ~50bps, vol_index=3.0",
    "Outputs are projections, not guaranteed.",
  ],
  btc_tactical: btcAssessment,
};

function monthlySeries(
  initial: number,
  monthlyReturnPct: number,
  months: number,
): InvestorMemoInput["backtests"][number]["monthlySeries"] {
  const out: InvestorMemoInput["backtests"][number]["monthlySeries"] = [];
  let value = initial;
  for (let i = 0; i < months; i += 1) {
    value = value * (1 + monthlyReturnPct / 100);
    out.push({
      month: `2026-${String(((i % 12) + 1)).padStart(2, "0")}`,
      valueUsdc: Math.round(value),
      distributionUsdc: Math.round(value * 0.008),
    });
  }
  return out;
}

const bearBacktest: BacktestOutput = {
  key: "bear_2022",
  startDate: "2022-01-01",
  endDate: "2023-12-31",
  initialCapital: 10_000_000,
  endingValue: 10_540_000,
  totalReturnPct: 5.4,
  maxDrawdownPct: -7.2,
  worstMonthPct: -2.1,
  numRebalances: 8,
  monthlySeries: monthlySeries(10_000_000, 0.22, 24),
  hearstRulesMode: true,
  assumptions: [
    "Backtest applies Hearst rules in defensive-leaning regime.",
    "Mining margin assumed paper attestation freshness 24h.",
    "Hashprice and difficulty are historical, not forecast.",
  ],
};

const etfHalving: BacktestOutput = {
  key: "etf_halving_2024",
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  initialCapital: 10_000_000,
  endingValue: 11_280_000,
  totalReturnPct: 12.8,
  maxDrawdownPct: -4.5,
  worstMonthPct: -1.4,
  numRebalances: 5,
  monthlySeries: monthlySeries(10_000_000, 1.0, 12),
  hearstRulesMode: true,
  assumptions: [
    "Hearst rules R3 triggered twice during BTC momentum window.",
    "Mining yield boosted by hashprice rally post-halving.",
    "Reserve floor maintained at 14% per regime bounds.",
  ],
};

const miningCrunch: BacktestOutput = {
  key: "mining_crunch_2024",
  startDate: "2024-04-01",
  endDate: "2024-10-31",
  initialCapital: 10_000_000,
  endingValue: 10_180_000,
  totalReturnPct: 1.8,
  maxDrawdownPct: -3.1,
  worstMonthPct: -1.0,
  numRebalances: 6,
  monthlySeries: monthlySeries(10_000_000, 0.25, 7),
  hearstRulesMode: true,
  assumptions: [
    "Hashprice compression triggered R2 then R4 sequentially.",
    "Stable reserve absorbed mining yield drag.",
    "BTC tactical sleeve held below 12% AUM throughout.",
  ],
};

export function getMockMemoInput(): InvestorMemoInput {
  return {
    vault: {
      aumUsdc: 24_600_000,
      apyRange: { low: 9.4, high: 12.8 },
      mode: "balanced",
      riskScore: 42,
    },
    scenarios: [
      baseScenario,
      bearScenario,
      miningCompression,
      bullScenario,
      extremeStress,
    ],
    backtests: [bearBacktest, etfHalving, miningCrunch],
    generatedAt: new Date().toISOString(),
  };
}
