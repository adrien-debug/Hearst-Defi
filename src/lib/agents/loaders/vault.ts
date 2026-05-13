import "server-only";

import { prisma } from "@/lib/db";
import type {
  Allocation,
  AllocationBucket,
  BacktestKey,
  BacktestOutput,
  Confidence,
  MonthlyPoint,
  ScenarioOutput,
  VaultMode,
} from "@/lib/engine/types";

/**
 * Shape returned to the Investor Memo cron — mirrors `InvestorMemoInput` but
 * declared independently so the loader does not import from `investor-memo.ts`
 * (which pulls the Anthropic SDK at module init).
 */
export interface MemoLoadResult {
  vault: {
    aumUsdc: number;
    apyRange: { low: number; high: number };
    mode: string;
    riskScore: number;
  };
  scenarios: ScenarioOutput[];
  backtests: BacktestOutput[];
  generatedAt: string;
}

const SCENARIO_LIMIT = 3;
const BACKTEST_LIMIT = 3;

/**
 * Loads the latest vault snapshot, recent persisted scenario runs, and the
 * most recent backtests.
 *
 * Decision: scenarios are read from `ScenarioRun.outputs` (JSON) rather than
 * re-running `runScenario()` here. The DB row IS the canonical artifact (it
 * was produced by the engine on a previous tick); rehydrating from JSON
 * keeps the loader pure-read and avoids re-execution skew when memo runs
 * monthly. If the persisted JSON ever drifts from `ScenarioOutput`, we throw
 * with a clear, schema-pointing message rather than silently coercing.
 */
export async function loadMemoInput(): Promise<MemoLoadResult> {
  const [snapshot, scenarioRows, backtestRows] = await Promise.all([
    prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
    prisma.scenarioRun.findMany({
      orderBy: { ranAt: "desc" },
      take: SCENARIO_LIMIT,
    }),
    prisma.backtestRun.findMany({
      orderBy: { ranAt: "desc" },
      take: BACKTEST_LIMIT,
    }),
  ]);

  if (!snapshot || backtestRows.length === 0) {
    throw new Error("Vault state incomplete. Run pnpm db:seed first.");
  }

  const vault = projectVault(snapshot);
  const scenarios = scenarioRows.map(parseScenarioOutput);
  const backtests = backtestRows.map(parseBacktestOutput);

  return {
    vault,
    scenarios,
    backtests,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Vault projection
// ---------------------------------------------------------------------------

interface VaultSnapshotRow {
  aumUsdc: number;
  currentApyLow: number;
  currentApyHigh: number;
  riskScore: number;
  mode: string;
}

function projectVault(row: VaultSnapshotRow): MemoLoadResult["vault"] {
  if (row.aumUsdc === null || row.aumUsdc === undefined) {
    throw new Error("VaultSnapshot.aumUsdc is null — invalid seed data.");
  }
  if (row.currentApyLow === null || row.currentApyHigh === null) {
    throw new Error("VaultSnapshot APY range fields are null — invalid seed data.");
  }
  return {
    aumUsdc: row.aumUsdc,
    apyRange: { low: row.currentApyLow, high: row.currentApyHigh },
    mode: row.mode,
    riskScore: row.riskScore,
  };
}

// ---------------------------------------------------------------------------
// Scenario rehydration — parses ScenarioRun.outputs JSON.
// ---------------------------------------------------------------------------

interface ScenarioRunRow {
  id: string;
  outputs: string;
}

function parseScenarioOutput(row: ScenarioRunRow): ScenarioOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.outputs);
  } catch {
    throw new Error(
      `ScenarioRun.outputs is not valid JSON (id=${row.id}). Re-run pnpm db:seed.`,
    );
  }
  if (!isRecord(parsed)) {
    throw new Error(
      `ScenarioRun.outputs is not an object (id=${row.id}). Re-run pnpm db:seed.`,
    );
  }
  return narrowScenarioOutput(parsed, row.id);
}

function narrowScenarioOutput(
  raw: Record<string, unknown>,
  id: string,
): ScenarioOutput {
  const apyRange = raw["apy_range"];
  if (!isRecord(apyRange)) {
    throw new Error(`ScenarioRun.outputs.apy_range missing (id=${id}).`);
  }
  const low = numField(apyRange, "low", `ScenarioRun(${id}).apy_range.low`);
  const high = numField(apyRange, "high", `ScenarioRun(${id}).apy_range.high`);

  const allocationsRaw = raw["allocations"];
  if (!Array.isArray(allocationsRaw)) {
    throw new Error(`ScenarioRun.outputs.allocations missing (id=${id}).`);
  }
  const allocations: Allocation[] = allocationsRaw.map((a, idx) => {
    if (!isRecord(a)) {
      throw new Error(`ScenarioRun(${id}).allocations[${idx}] not an object.`);
    }
    const bucket = a["bucket"];
    if (!isAllocationBucket(bucket)) {
      throw new Error(
        `ScenarioRun(${id}).allocations[${idx}].bucket invalid: ${String(bucket)}.`,
      );
    }
    return {
      bucket,
      pct: numField(a, "pct", `ScenarioRun(${id}).allocations[${idx}].pct`),
      yield_contribution_bps: numField(
        a,
        "yield_contribution_bps",
        `ScenarioRun(${id}).allocations[${idx}].yield_contribution_bps`,
      ),
    };
  });

  const assumptionsRaw = raw["assumptions"];
  if (!Array.isArray(assumptionsRaw)) {
    throw new Error(`ScenarioRun.outputs.assumptions missing (id=${id}).`);
  }
  const assumptions = assumptionsRaw.map((a) => {
    if (typeof a !== "string") {
      throw new Error(`ScenarioRun(${id}).assumptions entry not a string.`);
    }
    return a;
  });

  const mode = raw["mode"];
  if (!isVaultMode(mode)) {
    throw new Error(`ScenarioRun(${id}).mode invalid: ${String(mode)}.`);
  }

  const confidence = raw["confidence"];
  if (!isConfidence(confidence)) {
    throw new Error(`ScenarioRun(${id}).confidence invalid: ${String(confidence)}.`);
  }

  const btcTacticalRaw = raw["btc_tactical"];
  if (!isRecord(btcTacticalRaw)) {
    throw new Error(`ScenarioRun(${id}).btc_tactical missing.`);
  }
  // We pass through the btc_tactical block verbatim after a shallow shape
  // check; the agent only uses it for narrative context, and the engine
  // owns the strict typing. A deep zod schema lives outside this salvo.
  const triggers = btcTacticalRaw["triggers"];
  const guardrails = btcTacticalRaw["guardrails"];
  if (!Array.isArray(triggers) || !Array.isArray(guardrails)) {
    throw new Error(`ScenarioRun(${id}).btc_tactical.triggers/guardrails missing.`);
  }
  const targetExposurePct = numField(
    btcTacticalRaw,
    "targetExposurePct",
    `ScenarioRun(${id}).btc_tactical.targetExposurePct`,
  );

  return {
    apy_range: { low, high },
    stressed_apy: numField(raw, "stressed_apy", `ScenarioRun(${id}).stressed_apy`),
    risk_score: numField(raw, "risk_score", `ScenarioRun(${id}).risk_score`),
    mining_margin_score: numField(
      raw,
      "mining_margin_score",
      `ScenarioRun(${id}).mining_margin_score`,
    ),
    mode,
    allocations,
    assumptions,
    confidence,
    btc_tactical: {
      // The engine's strict types are enforced at the producer side
      // (runScenario); we trust the persisted shape here.
      triggers: triggers as ScenarioOutput["btc_tactical"]["triggers"],
      guardrails: guardrails as ScenarioOutput["btc_tactical"]["guardrails"],
      targetExposurePct,
    },
  };
}

// ---------------------------------------------------------------------------
// Backtest rehydration — parses BacktestRun row + monthlySeries JSON.
// ---------------------------------------------------------------------------

interface BacktestRunRow {
  id: string;
  backtestKey: string;
  initialCapital: number;
  endingValue: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  worstMonthPct: number;
  numRebalances: number;
  rulesMode: string;
  monthlySeries: string;
}

function parseBacktestOutput(row: BacktestRunRow): BacktestOutput {
  if (!isBacktestKey(row.backtestKey)) {
    throw new Error(
      `BacktestRun.backtestKey invalid: ${row.backtestKey} (id=${row.id}).`,
    );
  }

  let monthly: unknown;
  try {
    monthly = JSON.parse(row.monthlySeries);
  } catch {
    throw new Error(
      `BacktestRun.monthlySeries is not valid JSON (id=${row.id}). Re-run pnpm db:seed.`,
    );
  }
  if (!Array.isArray(monthly)) {
    throw new Error(`BacktestRun.monthlySeries is not an array (id=${row.id}).`);
  }
  const monthlySeries: MonthlyPoint[] = monthly.map((m, idx) => {
    if (!isRecord(m)) {
      throw new Error(`BacktestRun(${row.id}).monthlySeries[${idx}] not an object.`);
    }
    const month = m["month"];
    if (typeof month !== "string") {
      throw new Error(`BacktestRun(${row.id}).monthlySeries[${idx}].month not a string.`);
    }
    return {
      month,
      valueUsdc: numField(m, "valueUsdc", `BacktestRun(${row.id}).monthlySeries[${idx}].valueUsdc`),
      distributionUsdc: numField(
        m,
        "distributionUsdc",
        `BacktestRun(${row.id}).monthlySeries[${idx}].distributionUsdc`,
      ),
    };
  });

  const firstMonth = monthlySeries[0]?.month;
  const lastMonth = monthlySeries[monthlySeries.length - 1]?.month;
  if (firstMonth === undefined || lastMonth === undefined) {
    throw new Error(
      `BacktestRun.monthlySeries empty (id=${row.id}). Re-run pnpm db:seed.`,
    );
  }

  // Assumptions are not stored on BacktestRun (schema decision: spec lives in
  // the engine). We synthesise a minimal, factual assumption that points the
  // memo agent to the methodology version and the rules mode actually used.
  const assumptions = [
    `backtest_key=${row.backtestKey}; window=${firstMonth}..${lastMonth}`,
    `rulesMode=${row.rulesMode}; numRebalances=${row.numRebalances}`,
    "Historical simulation — not a projection of future performance",
    "methodology_version=v1.0",
  ];

  return {
    key: row.backtestKey,
    startDate: firstMonth,
    endDate: lastMonth,
    initialCapital: row.initialCapital,
    endingValue: row.endingValue,
    totalReturnPct: row.totalReturnPct,
    maxDrawdownPct: row.maxDrawdownPct,
    worstMonthPct: row.worstMonthPct,
    numRebalances: row.numRebalances,
    monthlySeries,
    hearstRulesMode: row.rulesMode === "hearst_rules",
    assumptions,
  };
}

// ---------------------------------------------------------------------------
// Narrow type guards (pure, no I/O).
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numField(
  obj: Record<string, unknown>,
  key: string,
  label: string,
): number {
  const v = obj[key];
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new Error(`${label} not a finite number.`);
  }
  return v;
}

function isAllocationBucket(v: unknown): v is AllocationBucket {
  return (
    v === "mining" ||
    v === "btc_tactical" ||
    v === "usdc_base" ||
    v === "stable_reserve"
  );
}

function isVaultMode(v: unknown): v is VaultMode {
  return v === "defensive" || v === "balanced" || v === "opportunistic";
}

function isConfidence(v: unknown): v is Confidence {
  return v === "low" || v === "medium" || v === "high";
}

function isBacktestKey(v: unknown): v is BacktestKey {
  return (
    v === "bear_2022" ||
    v === "etf_halving_2024" ||
    v === "mining_crunch_2024"
  );
}
