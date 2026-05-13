import { runScenario, METHODOLOGY_VERSION } from "./scenario";
import type {
  BacktestKey,
  BacktestOutput,
  MonthlyPoint,
  ScenarioInputs,
  VaultMode,
} from "./types";

const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "risk-free",
  "certain",
  "will deliver",
];

interface BacktestSpec {
  startDate: string;
  endDate: string;
  initialCapital: number;
  hearstRulesMode: boolean;
  startInputs: ScenarioInputs;
  endInputs: ScenarioInputs;
  halvingPeriod?: { startMonthIndex: number; endMonthIndex: number; hashpriceDip: number };
  assumptions: string[];
}

const SPECS: Record<BacktestKey, BacktestSpec> = {
  bear_2022: {
    startDate: "2022-06",
    endDate: "2023-06",
    initialCapital: 1_000_000,
    hearstRulesMode: true,
    startInputs: {
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.085,
      energy_cost_kwh: 0.045,
      stable_apy_pct: 4.5,
      vol_index: 2,
    },
    endInputs: {
      btc_price_change_pct: -65,
      hashprice_usd_th_day: 0.085 * (1 - 0.6),
      energy_cost_kwh: 0.05,
      stable_apy_pct: 4.5,
      vol_index: 3,
    },
    assumptions: [
      "bear_2022: BTC -65%, hashprice -60% over 12 months (Jun 2022 – Jun 2023)",
      "Linear interpolation applied across monthly steps; all projections use apy_range.low (conservative)",
      "Historical simulation — not a projection of future performance",
      `methodology_version=${METHODOLOGY_VERSION}`,
    ],
  },
  etf_halving_2024: {
    startDate: "2023-10",
    endDate: "2025-04",
    initialCapital: 1_000_000,
    hearstRulesMode: true,
    startInputs: {
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.085,
      energy_cost_kwh: 0.045,
      stable_apy_pct: 4.5,
      vol_index: 2,
    },
    endInputs: {
      btc_price_change_pct: 150,
      hashprice_usd_th_day: 0.085 * 1.4,
      energy_cost_kwh: 0.046,
      stable_apy_pct: 5.0,
      vol_index: 2.5,
    },
    // halving compression: months 7–10 (0-indexed) — mid-period dip of -20% on hashprice
    halvingPeriod: { startMonthIndex: 7, endMonthIndex: 10, hashpriceDip: -0.2 },
    assumptions: [
      "etf_halving_2024: BTC +150%, hashprice +40% over 18 months (Oct 2023 – Apr 2025)",
      "Halving compression applied months 7-10: hashprice dip -20% additional",
      "Linear interpolation applied across monthly steps; all projections use apy_range.low (conservative)",
      "Historical simulation — not a projection of future performance",
      `methodology_version=${METHODOLOGY_VERSION}`,
    ],
  },
  mining_crunch_2024: {
    startDate: "2024-04",
    endDate: "2024-12",
    initialCapital: 1_000_000,
    hearstRulesMode: true,
    startInputs: {
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.085,
      energy_cost_kwh: 0.045,
      stable_apy_pct: 4.5,
      vol_index: 2,
    },
    endInputs: {
      btc_price_change_pct: 0,
      hashprice_usd_th_day: 0.085 * (1 - 0.4),
      energy_cost_kwh: 0.045 * (1 + 0.3),
      stable_apy_pct: 4.5,
      vol_index: 2.2,
    },
    assumptions: [
      "mining_crunch_2024: hashprice -40%, difficulty +30% (proxied via energy cost), BTC flat over 9 months (Apr–Dec 2024)",
      "Linear interpolation applied across monthly steps; all projections use apy_range.low (conservative)",
      "Historical simulation — not a projection of future performance",
      `methodology_version=${METHODOLOGY_VERSION}`,
    ],
  },
};

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split("-").map(Number) as [number, number];
  const [ey, em] = end.split("-").map(Number) as [number, number];
  return (ey - sy) * 12 + (em - sm);
}

function addMonths(base: string, count: number): string {
  const [y, m] = base.split("-").map(Number) as [number, number];
  const total = (y * 12 + (m - 1)) + count;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateInputs(
  start: ScenarioInputs,
  end: ScenarioInputs,
  t: number,
): ScenarioInputs {
  return {
    btc_price_change_pct: lerp(start.btc_price_change_pct, end.btc_price_change_pct, t),
    hashprice_usd_th_day: lerp(start.hashprice_usd_th_day, end.hashprice_usd_th_day, t),
    energy_cost_kwh: lerp(start.energy_cost_kwh, end.energy_cost_kwh, t),
    stable_apy_pct: lerp(start.stable_apy_pct, end.stable_apy_pct, t),
    vol_index: lerp(start.vol_index, end.vol_index, t),
  };
}

function assertNoForbiddenWords(assumptions: string[]): void {
  for (const line of assumptions) {
    const lower = line.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
      if (word === "guarantee" && lower.includes("not guaranteed")) continue;
      if (lower.includes(word)) {
        throw new Error(`forbidden word "${word}" in backtest assumption: ${line}`);
      }
    }
  }
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

export function runBacktest(key: BacktestKey, opts?: { now?: Date }): BacktestOutput {
  const spec = SPECS[key];
  const now = opts?.now ?? new Date(0);
  const totalMonths = monthsBetween(spec.startDate, spec.endDate);

  assertNoForbiddenWords(spec.assumptions);

  const monthlySeries: MonthlyPoint[] = [];
  let currentValue = spec.initialCapital;
  let peakValue = spec.initialCapital;
  let maxDrawdownPct = 0;
  let worstMonthPct = 0;
  let numRebalances = 0;
  let prevMode: VaultMode | null = null;

  for (let i = 0; i <= totalMonths; i++) {
    const t = totalMonths === 0 ? 0 : i / totalMonths;
    const month = addMonths(spec.startDate, i);

    let inputs = interpolateInputs(spec.startInputs, spec.endInputs, t);

    // Apply halving compression dip if applicable
    if (spec.halvingPeriod !== undefined) {
      const hp = spec.halvingPeriod;
      if (i >= hp.startMonthIndex && i <= hp.endMonthIndex) {
        inputs = {
          ...inputs,
          hashprice_usd_th_day: inputs.hashprice_usd_th_day * (1 + hp.hashpriceDip),
        };
      }
    }

    const out = runScenario(inputs, { now });
    const mode = out.mode;

    if (prevMode !== null && prevMode !== mode) {
      numRebalances++;
    }
    prevMode = mode;

    // Monthly return using apy_range.low (conservative)
    const monthlyReturnRate = out.apy_range.low / 100 / 12;
    const distributionUsdc = round(currentValue * monthlyReturnRate, 2);

    // Apply return to value
    const prevValue = currentValue;
    currentValue = round(currentValue * (1 + monthlyReturnRate), 2);

    // Track peak/drawdown
    if (currentValue > peakValue) peakValue = currentValue;
    const drawdown = peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;
    if (drawdown > maxDrawdownPct) maxDrawdownPct = drawdown;

    // Track worst month
    const monthReturnPct = prevValue > 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;
    if (monthReturnPct < worstMonthPct) worstMonthPct = monthReturnPct;

    monthlySeries.push({ month, valueUsdc: currentValue, distributionUsdc });
  }

  const endingValue = monthlySeries[monthlySeries.length - 1]?.valueUsdc ?? spec.initialCapital;
  const totalReturnPct = round(
    ((endingValue - spec.initialCapital) / spec.initialCapital) * 100,
    2,
  );

  return {
    key,
    startDate: spec.startDate,
    endDate: spec.endDate,
    initialCapital: spec.initialCapital,
    endingValue: round(endingValue, 2),
    totalReturnPct,
    maxDrawdownPct: round(maxDrawdownPct, 2),
    worstMonthPct: round(worstMonthPct, 2),
    numRebalances,
    monthlySeries,
    hearstRulesMode: spec.hearstRulesMode,
    assumptions: spec.assumptions,
  };
}
