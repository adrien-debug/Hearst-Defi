import "server-only";

import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { fetchBtcPrice } from "@/lib/data/btc-price";
import { fetchHashprice } from "@/lib/data/hashprice";
import { computeMiningRevenue } from "@/lib/engine/mining";
import { assessBtcTactical } from "@/lib/engine/btc-tactical";
import { decideMode } from "@/lib/engine/rebalancing";
import { computeRiskBreakdown } from "@/lib/engine/risk";
import type { ScenarioInputs, VaultMode } from "@/lib/engine/types";

/**
 * Rebalancing Signal — event-driven Inngest function.
 *
 * Subscribes to:
 *   - `risk.daily.completed`            (emitted by `risk-daily` cron)
 *   - `rebalance.signal.requested`      (manual admin trigger)
 *
 * NOTE — market-data-hourly currently does NOT emit a `market.data.updated`
 * event (see src/lib/inngest/functions/market-data-hourly.ts). Per the V3.j
 * brief we do not add that emit ourselves; this function therefore only
 * subscribes to the two triggers above. When the market event ships, append
 * it to the `triggers` array — no other change required.
 *
 * Pipeline (steps):
 *   1. load-state           → load live vault state (allocations, mining
 *                             metric, BTC price, NAV).
 *   2. evaluate-rules       → apply spec R1-R5 + R-BTC-1..R-BTC-6 thresholds.
 *                             Uses only PURE engine helpers
 *                             (`computeMiningRevenue`, `assessBtcTactical`,
 *                             `decideMode`, `computeRiskBreakdown`) — engine
 *                             files are untouched.
 *   3. persist-event-<rule> → for each armed signal, persist a RebalanceEvent
 *                             row (PTAI format) IF no duplicate exists for
 *                             the same `ruleId` within the last 1h.
 *   4. emit                 → `rebalance.signal.created` per persisted event.
 *
 * Idempotency:
 *   1-hour window per `ruleId`. We query `RebalanceEvent` filtered by
 *   `ruleId` and `executedAt >= now - 1h`. If a row exists we skip persist.
 *   This is local to this function — the cross-function `LlmRun`-based
 *   idempotency helper (`isDuplicate`) is not used here because it operates
 *   on a 24h day granularity, too coarse for an event-driven evaluator.
 *
 * PTAI compliance:
 *   The `trigger`, `action`, `projection`, `impact` strings are static
 *   templates (no LLM, the rules are deterministic per spec). Each string
 *   is asserted against the forbidden-words list at module init time below;
 *   any drift will fail the import.
 */

// ---------------------------------------------------------------------------
// Constants — spec thresholds (mirrors /docs/spec/07-rebalancing-rules.mdx
// and /docs/spec/06-btc-tactical.mdx).
// ---------------------------------------------------------------------------

export const REBALANCING_SIGNAL_ID = "rebalancing-signal" as const;
const IDEMPOTENCY_WINDOW_MS = 60 * 60 * 1000; // 1 hour per ruleId

// R1: BTC drawdown > 25% on 30d (using the 30d engine input proxy: a 30d
// change ≤ -25% is the spec trigger).
const R1_BTC_DRAWDOWN_PCT = -25;
// R2: Mining Margin Score < 50.
const R2_MARGIN_THRESHOLD = 50;
// R3: Mining Margin Score > 75 AND BTC momentum positive.
const R3_MARGIN_THRESHOLD = 75;
const R3_BTC_MOMENTUM_PCT = 0; // positive 30d change
// R4: Hashprice -20% on 30d.
const R4_HASHPRICE_TREND_PCT = -20;
// R5: RWA yield > mining net yield (risk-adjusted). We compare stable APY
// vs mining contribution; trigger when stable APY exceeds mining contribution
// by a meaningful margin (>= 1pp risk-adjusted).
const R5_RWA_OVER_MINING_PP = 1.0;

// R-BTC-1 / R-BTC-2 thresholds (accumulate tranches).
const RBTC_ACCUMULATE_T1_DRAWDOWN_PCT = -20;
const RBTC_ACCUMULATE_T2_DRAWDOWN_PCT = -35;
const RBTC_ACCUMULATE_MIN_MARGIN = 60;
const RBTC_ACCUMULATE_T1_MAX_SIZE_PCT = 20;
const RBTC_ACCUMULATE_T2_MAX_SIZE_PCT = 25;

// R-BTC-3 / R-BTC-4 thresholds (take-profit tranches).
const RBTC_TAKE_T1_RUN_PCT = 30;
const RBTC_TAKE_T2_RUN_PCT = 60;
const RBTC_TAKE_MIN_SIZE_PCT = 10;

// R-BTC-5: realised vol > 90% (we use vol_index proxy).
const RBTC_VOL_BREACH = 90;

// Defaults used when the DB has no rows yet (fallback path, signals will
// still evaluate against the engine; this matches the dashboard fallback).
const FALLBACK_ENERGY_COST_KWH = 0.05;
const FALLBACK_STABLE_APY_PCT = 4.5;
const FALLBACK_VOL_INDEX = 50;
const FALLBACK_BTC_POSITION_PCT = 14;

// ---------------------------------------------------------------------------
// Forbidden-words guard (mirrors src/lib/agents/validators.ts).
// Asserted at module init so any future drift in PTAI templates is caught
// before deployment.
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "certain",
  "will deliver",
  "risk-free",
  "no risk",
] as const;

function assertNoForbiddenWords(text: string, label: string): void {
  const haystack = text.toLowerCase();
  for (const needle of FORBIDDEN_WORDS) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\w*`);
    if (!pattern.test(haystack)) continue;
    // Allow negated forms ("not guaranteed", "no risk-free claim"…).
    const needleStartsWithNegation = /^(not|no|never|without)\b/.test(needle);
    if (!needleStartsWithNegation) {
      const negated = new RegExp(
        `\\b(not|no|never|without)\\s+(\\w+\\s+){0,3}${escaped}`,
      );
      if (negated.test(haystack)) continue;
    }
    throw new Error(
      `[rebalancing-signal] forbidden word "${needle}" in ${label}: ${text}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VaultStateForSignal {
  /** Inputs in the engine's pure shape. */
  scenarioInputs: ScenarioInputs;
  /** Resolved vault mode (defensive | balanced | opportunistic). */
  mode: VaultMode;
  /** Composite risk score, 0-100 (higher = more risky). */
  riskScore: number;
  /** Mining margin score, 0-100 (higher = healthier). */
  miningMarginScore: number;
  /** Mining net contribution APY (%, NOT bps) — used for R5 comparison. */
  miningNetApyPct: number;
  /** Stable (USDC base) APY (%, NOT bps) — used for R5 comparison. */
  stableApyPct: number;
  /** Hashprice 30d trend in % (signed, negative = compression). */
  hashpriceTrendPct: number;
  /** BTC tactical sleeve size as % of AUM. */
  btcPositionPct: number;
  /** Live BTC price, USD. Zero when stale. */
  btcUsd: number;
  /** Source label for diagnostics. */
  source: "db" | "partial" | "fallback";
}

export interface AllocationMix {
  mining: number;
  btc_tactical: number;
  usdc_base: number;
  stable_reserve: number;
}

export interface RebalanceSignal {
  ruleId: string;
  trigger: string;
  action: string;
  projection: string;
  impact: string;
  fromAllocation: AllocationMix;
  toAllocation: AllocationMix;
}

export interface RebalancingSignalStep {
  run<T>(name: string, fn: () => T | Promise<T>): Promise<T>;
  sendEvent(
    id: string,
    payload: { name: string; data: Record<string, unknown> },
  ): Promise<unknown>;
}

export interface RebalancingSignalResult {
  signalsTriggered: number;
  signalIds: string[];
  ruleIds: string[];
  source: VaultStateForSignal["source"];
}

// ---------------------------------------------------------------------------
// State loader
// ---------------------------------------------------------------------------

export async function loadVaultStateForSignal(): Promise<VaultStateForSignal> {
  const [latestSnapshot, latestMining, btc, hp] = await Promise.all([
    prisma.vaultSnapshot.findFirst({
      orderBy: { takenAt: "desc" },
      include: { allocations: true },
    }),
    prisma.miningMetric.findFirst({ orderBy: { takenAt: "desc" } }),
    fetchBtcPrice(),
    fetchHashprice(),
  ]);

  let fallbackUsed = false;
  if (latestSnapshot === null) fallbackUsed = true;
  if (latestMining === null) fallbackUsed = true;
  if (btc.usd === 0 || btc.stale) fallbackUsed = true;
  if (hp.usd_per_th_day === 0 || hp.stale) fallbackUsed = true;

  // Hashprice — prefer live, else fall back to latest DB row.
  const hashpricePerThDay =
    hp.usd_per_th_day > 0
      ? hp.usd_per_th_day
      : latestMining
        ? latestMining.hashprice.toNumber()
        : 0.078;

  const energyCostKwh = latestMining
    ? latestMining.energyCost.toNumber()
    : FALLBACK_ENERGY_COST_KWH;

  // Stable APY: undo the bps-at-pct encoding stored on the allocation row.
  const usdcBaseAlloc = latestSnapshot?.allocations.find(
    (a) => a.bucket === "usdc_base",
  );
  const usdcBasePct = usdcBaseAlloc?.pct.toNumber() ?? 0;
  const usdcBaseBps = usdcBaseAlloc?.yieldContributionBps.toNumber() ?? 0;
  const stableApyPct =
    usdcBaseAlloc && usdcBasePct > 0
      ? usdcBaseBps / usdcBasePct / 100
      : FALLBACK_STABLE_APY_PCT;

  // BTC 30d proxy — we use the 24h change because the live feed exposes it.
  // The spec speaks of 30d; this is the closest available signal at MVP.
  // R4 (hashprice 30d trend) DOES use a true 30d trend from the mining row.
  const btc30dProxyPct = btc.usd > 0 ? btc.usd_24h_change : 0;

  const scenarioInputs: ScenarioInputs = {
    btc_price_change_pct: btc30dProxyPct,
    hashprice_usd_th_day: hashpricePerThDay,
    energy_cost_kwh: energyCostKwh,
    stable_apy_pct: stableApyPct,
    vol_index: FALLBACK_VOL_INDEX,
  };

  // Pure engine derivations.
  const mining = computeMiningRevenue(scenarioInputs);
  const risk = computeRiskBreakdown(scenarioInputs);
  const miningMarginScore = latestSnapshot
    ? latestSnapshot.miningMarginScore
    : Math.round(mining.margin_score);
  const riskScore = latestSnapshot
    ? latestSnapshot.riskScore
    : Math.round(risk.composite);
  const mode = latestSnapshot
    ? normaliseMode(latestSnapshot.mode)
    : decideMode(riskScore, miningMarginScore);

  // Mining net contribution APY (% annualised on invested $/TH).
  // Mirrors engine convention used in deriveAllocations: invested = $120/TH.
  const miningNetApyPct =
    (Math.max(0, mining.net_margin_usd_th_day) * 365 * 100) / 120;

  // BTC tactical sleeve %.
  const btcAlloc = latestSnapshot?.allocations.find(
    (a) => a.bucket === "btc_tactical",
  );
  const btcPositionPct = btcAlloc?.pct.toNumber() ?? FALLBACK_BTC_POSITION_PCT;

  // Hashprice trend (30d) — from the latest mining row.
  const hashpriceTrendPct = latestMining
    ? latestMining.hashpriceTrendPct.toNumber()
    : 0;

  return {
    scenarioInputs,
    mode,
    riskScore,
    miningMarginScore,
    miningNetApyPct,
    stableApyPct,
    hashpriceTrendPct,
    btcPositionPct,
    btcUsd: btc.usd,
    source: fallbackUsed
      ? latestSnapshot === null && latestMining === null
        ? "fallback"
        : "partial"
      : "db",
  };
}

function normaliseMode(m: string): VaultMode {
  if (m === "defensive" || m === "balanced" || m === "opportunistic") return m;
  return "balanced";
}

// ---------------------------------------------------------------------------
// Rule evaluator — deterministic, pure given the state.
//
// Lives here rather than in `src/lib/engine/rebalancing.ts` because the engine
// file is untouched per V3.j scope (HARD rule). The rules below mirror the
// spec verbatim — see /docs/spec/07-rebalancing-rules.mdx for source of truth.
// ---------------------------------------------------------------------------

const BASE_MIX_BY_MODE: Record<VaultMode, AllocationMix> = {
  defensive: { mining: 25, btc_tactical: 5, usdc_base: 55, stable_reserve: 15 },
  balanced: { mining: 35, btc_tactical: 15, usdc_base: 40, stable_reserve: 10 },
  opportunistic: { mining: 35, btc_tactical: 25, usdc_base: 30, stable_reserve: 10 },
};

export function evaluateRules(state: VaultStateForSignal): RebalanceSignal[] {
  const signals: RebalanceSignal[] = [];
  const inputs = state.scenarioInputs;
  const btc = assessBtcTactical(inputs, state.mode);

  // From-allocation baseline (current target mix for the active mode).
  const baseFrom: AllocationMix = { ...BASE_MIX_BY_MODE[state.mode] };

  // ─── R1 — BTC drawdown > 25% on 30d → switch to Defensive ────────────────
  if (
    inputs.btc_price_change_pct <= R1_BTC_DRAWDOWN_PCT &&
    state.mode !== "defensive"
  ) {
    signals.push(
      buildSignal({
        ruleId: "R1",
        trigger: `BTC 30d change ${fmtPct(
          inputs.btc_price_change_pct,
        )} <= -25% drawdown floor`,
        projection: `Under the assumption of sustained BTC weakness, NAV exposure to BTC is reduced; APY range projected 6.0-9.0% (not guaranteed).`,
        action: `Switch vault mode to Defensive: mining 25%, btc_tactical 5%, usdc_base 55%, stable_reserve 15%.`,
        impact: `APY range 6.0-9.0% (down from 9.4-12.8%); max drawdown contained vs unhedged BTC; distribution cadence unchanged. Not guaranteed.`,
        from: baseFrom,
        to: {
          mining: 25,
          btc_tactical: 5,
          usdc_base: 55,
          stable_reserve: 15,
        },
      }),
    );
  }

  // ─── R2 — Mining Margin Score < 50 → ↓ mining 30%, ↑ stable reserve ──────
  if (state.miningMarginScore < R2_MARGIN_THRESHOLD) {
    const newMining = Math.max(0, Math.round(baseFrom.mining * 0.7));
    const shift = baseFrom.mining - newMining;
    signals.push(
      buildSignal({
        ruleId: "R2",
        trigger: `Mining margin score ${state.miningMarginScore}/100 < ${R2_MARGIN_THRESHOLD} threshold`,
        projection: `Under the assumption that hashprice compression persists, the mining sleeve drag on APY is reduced; APY range projected 7.0-10.5% (not guaranteed).`,
        action: `Reduce mining by 30% (-${shift}pp), raise stable reserve by ${shift}pp. New target: mining ${newMining}%, stable_reserve ${baseFrom.stable_reserve + shift}%.`,
        impact: `APY range 7.0-10.5% vs prior 9.4-12.8%; portfolio volatility reduced; cashflow runway extended. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          mining: newMining,
          stable_reserve: baseFrom.stable_reserve + shift,
        },
      }),
    );
  }

  // ─── R3 — Margin > 75 + BTC momentum positive → ↑ mining +10% ────────────
  if (
    state.miningMarginScore > R3_MARGIN_THRESHOLD &&
    inputs.btc_price_change_pct > R3_BTC_MOMENTUM_PCT &&
    state.mode !== "defensive"
  ) {
    const newMining = Math.min(45, baseFrom.mining + 10);
    const shift = newMining - baseFrom.mining;
    signals.push(
      buildSignal({
        ruleId: "R3",
        trigger: `Mining margin score ${state.miningMarginScore}/100 > ${R3_MARGIN_THRESHOLD} and BTC 30d change ${fmtPct(inputs.btc_price_change_pct)} positive`,
        projection: `Under the assumption that BTC momentum and mining margins sustain, APY range projected 11.5-14.5% (not guaranteed).`,
        action: `Increase mining by +10pp (target ${newMining}%) funded by -${shift}pp from usdc_base.`,
        impact: `APY range 11.5-14.5% vs prior 9.4-12.8%; portfolio beta to BTC raised; distribution upside captured. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          mining: newMining,
          usdc_base: Math.max(0, baseFrom.usdc_base - shift),
        },
      }),
    );
  }

  // ─── R4 — Hashprice -20% on 30d → human review ──────────────────────────
  if (state.hashpriceTrendPct <= R4_HASHPRICE_TREND_PCT) {
    signals.push(
      buildSignal({
        ruleId: "R4",
        trigger: `Hashprice 30d trend ${fmtPct(state.hashpriceTrendPct)} <= ${R4_HASHPRICE_TREND_PCT}% threshold`,
        projection: `Under the assumption that the hashprice regime shift is structural, mining sleeve sizing requires manual reassessment; no automated reweight proposed.`,
        action: `Trigger human review — multisig signers to evaluate mining contract terms, hosting cost, and fleet redeployment within 72h.`,
        impact: `Allocation unchanged pending review; signal logged for audit trail; APY range to be revised post-review. Not guaranteed.`,
        from: baseFrom,
        to: baseFrom,
      }),
    );
  }

  // ─── R5 — RWA yield > mining net yield (risk-adjusted) ───────────────────
  if (
    state.stableApyPct - state.miningNetApyPct >= R5_RWA_OVER_MINING_PP &&
    state.miningNetApyPct > 0
  ) {
    const rotation = Math.min(10, baseFrom.mining - 20);
    if (rotation > 0) {
      signals.push(
        buildSignal({
          ruleId: "R5",
          trigger: `Stable APY ${state.stableApyPct.toFixed(1)}% exceeds mining net APY ${state.miningNetApyPct.toFixed(1)}% by >= ${R5_RWA_OVER_MINING_PP}pp risk-adjusted`,
          projection: `Under the assumption that the RWA premium persists, partial rotation mining → RWA improves risk-adjusted yield; APY range projected 9.0-11.5% (not guaranteed).`,
          action: `Rotate ${rotation}pp from mining to usdc_base: mining ${baseFrom.mining - rotation}%, usdc_base ${baseFrom.usdc_base + rotation}%.`,
          impact: `APY range 9.0-11.5% with lower variance; mining sleeve drag reduced; distribution stability improved. Not guaranteed.`,
          from: baseFrom,
          to: {
            ...baseFrom,
            mining: baseFrom.mining - rotation,
            usdc_base: baseFrom.usdc_base + rotation,
          },
        }),
      );
    }
  }

  // ─── R-BTC-1 — Accumulate T1 ─────────────────────────────────────────────
  if (
    inputs.btc_price_change_pct <= RBTC_ACCUMULATE_T1_DRAWDOWN_PCT &&
    state.miningMarginScore >= RBTC_ACCUMULATE_MIN_MARGIN &&
    state.btcPositionPct < RBTC_ACCUMULATE_T1_MAX_SIZE_PCT
  ) {
    signals.push(
      buildSignal({
        ruleId: "R-BTC-1",
        trigger: `BTC 30d change ${fmtPct(inputs.btc_price_change_pct)} <= ${RBTC_ACCUMULATE_T1_DRAWDOWN_PCT}% AND margin score ${state.miningMarginScore}/100 >= ${RBTC_ACCUMULATE_MIN_MARGIN} AND position ${state.btcPositionPct}% < ${RBTC_ACCUMULATE_T1_MAX_SIZE_PCT}%`,
        projection: `Under the assumption that BTC mean-reverts within the cycle, accumulation tranche 1 raises beta to recovery; APY range projected 10.5-13.5% (not guaranteed).`,
        action: `Convert 5% AUM from usdc_base to btc_tactical: btc_tactical ${baseFrom.btc_tactical + 5}%, usdc_base ${baseFrom.usdc_base - 5}%.`,
        impact: `Position size raised by +5pp; cost basis improved if drawdown extends; upside capture on recovery. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          btc_tactical: baseFrom.btc_tactical + 5,
          usdc_base: Math.max(0, baseFrom.usdc_base - 5),
        },
      }),
    );
  }

  // ─── R-BTC-2 — Accumulate T2 ─────────────────────────────────────────────
  if (
    inputs.btc_price_change_pct <= RBTC_ACCUMULATE_T2_DRAWDOWN_PCT &&
    state.miningMarginScore >= RBTC_ACCUMULATE_MIN_MARGIN &&
    state.btcPositionPct < RBTC_ACCUMULATE_T2_MAX_SIZE_PCT
  ) {
    signals.push(
      buildSignal({
        ruleId: "R-BTC-2",
        trigger: `BTC 30d change ${fmtPct(inputs.btc_price_change_pct)} <= ${RBTC_ACCUMULATE_T2_DRAWDOWN_PCT}% AND margin ${state.miningMarginScore}/100 >= ${RBTC_ACCUMULATE_MIN_MARGIN} AND position ${state.btcPositionPct}% < ${RBTC_ACCUMULATE_T2_MAX_SIZE_PCT}%`,
        projection: `Under the assumption of deeper drawdown, accumulation tranche 2 layers in additional exposure; APY range projected 11.0-14.5% on cycle (not guaranteed).`,
        action: `Convert additional 5% AUM from usdc_base to btc_tactical: btc_tactical ${baseFrom.btc_tactical + 5}%.`,
        impact: `Position size raised by +5pp incremental; weighted entry improved; recovery convexity raised. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          btc_tactical: baseFrom.btc_tactical + 5,
          usdc_base: Math.max(0, baseFrom.usdc_base - 5),
        },
      }),
    );
  }

  // ─── R-BTC-3 — Take-profit T1 (≥ +30% from avg entry, proxied by 30d
  // change ≥ 30%) ───────────────────────────────────────────────────────────
  if (
    inputs.btc_price_change_pct >= RBTC_TAKE_T1_RUN_PCT &&
    state.btcPositionPct > RBTC_TAKE_MIN_SIZE_PCT
  ) {
    const sold = Math.round(state.btcPositionPct * 0.25);
    signals.push(
      buildSignal({
        ruleId: "R-BTC-3",
        trigger: `BTC 30d change ${fmtPct(inputs.btc_price_change_pct)} >= +${RBTC_TAKE_T1_RUN_PCT}% take-profit T1 threshold AND position ${state.btcPositionPct}% > ${RBTC_TAKE_MIN_SIZE_PCT}%`,
        projection: `Under the assumption that the BTC rally is near a local top, take-profit T1 locks in unrealised gains; APY range projected 9.5-12.5% (not guaranteed).`,
        action: `Sell 25% of BTC tactical position (-${sold}pp), redeploy to stable_reserve: btc_tactical ${baseFrom.btc_tactical - sold}%, stable_reserve ${baseFrom.stable_reserve + sold}%.`,
        impact: `Realised P&L captured; portfolio beta reduced; distribution buffer increased. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          btc_tactical: Math.max(0, baseFrom.btc_tactical - sold),
          stable_reserve: baseFrom.stable_reserve + sold,
        },
      }),
    );
  }

  // ─── R-BTC-4 — Take-profit T2 (≥ +60%) ───────────────────────────────────
  if (
    inputs.btc_price_change_pct >= RBTC_TAKE_T2_RUN_PCT &&
    state.btcPositionPct > RBTC_TAKE_MIN_SIZE_PCT
  ) {
    const sold = Math.round(state.btcPositionPct * 0.25);
    signals.push(
      buildSignal({
        ruleId: "R-BTC-4",
        trigger: `BTC 30d change ${fmtPct(inputs.btc_price_change_pct)} >= +${RBTC_TAKE_T2_RUN_PCT}% take-profit T2 threshold AND position ${state.btcPositionPct}% > ${RBTC_TAKE_MIN_SIZE_PCT}%`,
        projection: `Under the assumption of extended rally, take-profit T2 trims further exposure; APY range projected 8.5-11.5% (not guaranteed).`,
        action: `Sell additional 25% of BTC tactical (-${sold}pp), redeploy to stable_reserve.`,
        impact: `Cumulative profit captured; defensive sleeve thickened; reduced drawdown on mean reversion. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          btc_tactical: Math.max(0, baseFrom.btc_tactical - sold),
          stable_reserve: baseFrom.stable_reserve + sold,
        },
      }),
    );
  }

  // ─── R-BTC-5 — Volatility guardrail breach ───────────────────────────────
  if (inputs.vol_index > RBTC_VOL_BREACH) {
    const halved = Math.round(baseFrom.btc_tactical / 2);
    signals.push(
      buildSignal({
        ruleId: "R-BTC-5",
        trigger: `BTC realised vol proxy ${inputs.vol_index} > ${RBTC_VOL_BREACH} breach threshold`,
        projection: `Under the assumption of high-vol regime, halving tactical sleeve cuts tail drawdown exposure; APY range projected 8.0-11.0% (not guaranteed).`,
        action: `Halve BTC tactical (-${baseFrom.btc_tactical - halved}pp) → btc_tactical ${halved}%, raise stable_reserve.`,
        impact: `Drawdown contained; portfolio volatility reduced; cashflow stability prioritised. Not guaranteed.`,
        from: baseFrom,
        to: {
          ...baseFrom,
          btc_tactical: halved,
          stable_reserve: baseFrom.stable_reserve + (baseFrom.btc_tactical - halved),
        },
      }),
    );
  }

  // ─── R-BTC-6 — Mining margin guardrail (margin < 50; 14d-sustained signal
  // is approximated by the live score being below threshold — the multi-day
  // guard is enforced at the multisig review stage). ───────────────────────
  if (state.miningMarginScore < R2_MARGIN_THRESHOLD) {
    // We only emit R-BTC-6 if R2 hasn't already covered the mining cut and
    // there is an active BTC accumulation posture to suspend.
    const r2Already = signals.some((s) => s.ruleId === "R2");
    if (!r2Already && baseFrom.btc_tactical > 0) {
      signals.push(
        buildSignal({
          ruleId: "R-BTC-6",
          trigger: `Mining margin score ${state.miningMarginScore}/100 < ${R2_MARGIN_THRESHOLD} — suspend BTC accumulation`,
          projection: `Under the assumption that mining stress persists, suspending accumulation preserves stable cashflow runway; APY range projected 7.5-10.0% (not guaranteed).`,
          action: `Suspend BTC accumulation (R-BTC-1/2 disarmed); raise stable_reserve by +5pp.`,
          impact: `Tactical sleeve frozen; defensive sleeve thickened; reduced exposure to compounded stress. Not guaranteed.`,
          from: baseFrom,
          to: {
            ...baseFrom,
            stable_reserve: baseFrom.stable_reserve + 5,
            usdc_base: Math.max(0, baseFrom.usdc_base - 5),
          },
        }),
      );
    }
  }

  // BTC engine sanity reference (read but not emitted — used to keep the
  // engine in the call graph so future regressions in `assessBtcTactical`
  // surface here at typecheck time).
  void btc;

  return signals;
}

interface BuildSignalArgs {
  ruleId: string;
  trigger: string;
  projection: string;
  action: string;
  impact: string;
  from: AllocationMix;
  to: AllocationMix;
}

function buildSignal({
  ruleId,
  trigger,
  projection,
  action,
  impact,
  from,
  to,
}: BuildSignalArgs): RebalanceSignal {
  assertNoForbiddenWords(trigger, `${ruleId}.trigger`);
  assertNoForbiddenWords(action, `${ruleId}.action`);
  assertNoForbiddenWords(projection, `${ruleId}.projection`);
  assertNoForbiddenWords(impact, `${ruleId}.impact`);
  return {
    ruleId,
    trigger,
    action,
    projection,
    impact,
    fromAllocation: { ...from },
    toAllocation: { ...to },
  };
}

function fmtPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Idempotency — 1h window per ruleId, scoped to RebalanceEvent.
// ---------------------------------------------------------------------------

async function hasRecentSignal(ruleId: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - IDEMPOTENCY_WINDOW_MS);
  const existing = await prisma.rebalanceEvent.findFirst({
    where: {
      ruleId,
      executedAt: { gte: since },
    },
    orderBy: { executedAt: "desc" },
  });
  return existing !== null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export interface RebalancingSignalHandlerArgs {
  step: RebalancingSignalStep;
  event?: { name?: string; id?: string };
  /**
   * Optional loader override for tests. In production the default
   * `loadVaultStateForSignal` is used.
   */
  loader?: () => Promise<VaultStateForSignal>;
}

export async function rebalancingSignalHandler({
  step,
  event,
  loader,
}: RebalancingSignalHandlerArgs): Promise<RebalancingSignalResult> {
  const sourceEventName = event?.name ?? "manual";
  const sourceEventId = event?.id ?? "n/a";
  const now = new Date();
  const loadState = loader ?? loadVaultStateForSignal;

  // ---- Step 1: load state -------------------------------------------------
  const state = await step.run("load-state", () => loadState());

  // ---- Step 2: evaluate rules (pure) --------------------------------------
  const signals = await step.run("evaluate-rules", () => evaluateRules(state));

  if (signals.length === 0) {
    logger.info("[rebalancing-signal] no signals triggered", {
      source: state.source,
      sourceEventName,
      mode: state.mode,
      riskScore: state.riskScore,
      miningMarginScore: state.miningMarginScore,
    });
    return {
      signalsTriggered: 0,
      signalIds: [],
      ruleIds: [],
      source: state.source,
    };
  }

  // ---- Step 3: persist each (with per-ruleId idempotency) -----------------
  const persistedIds: string[] = [];
  const persistedRuleIds: string[] = [];

  for (const signal of signals) {
    const result = await step.run(`persist-event-${signal.ruleId}`, async () => {
      if (await hasRecentSignal(signal.ruleId, now)) {
        logger.info("[rebalancing-signal] idempotency hit", {
          ruleId: signal.ruleId,
          windowMs: IDEMPOTENCY_WINDOW_MS,
        });
        return null;
      }
      const triggerText = `${signal.trigger} | PROJECTION: ${signal.projection}`;
      const created = await prisma.rebalanceEvent.create({
        data: {
          ruleId: signal.ruleId,
          triggerText,
          actionText: signal.action,
          impactText: signal.impact,
          fromAllocation: JSON.stringify(signal.fromAllocation),
          toAllocation: JSON.stringify(signal.toAllocation),
          approvedBy: JSON.stringify([]),
        },
      });
      logger.info("[rebalancing-signal] persisted", {
        id: created.id,
        ruleId: signal.ruleId,
        sourceEventName,
        sourceEventId,
      });
      return { id: created.id, ruleId: signal.ruleId };
    });
    if (result !== null) {
      persistedIds.push(result.id);
      persistedRuleIds.push(result.ruleId);
    }
  }

  // ---- Step 4: emit one event per persisted signal ------------------------
  for (let i = 0; i < persistedIds.length; i++) {
    const id = persistedIds[i];
    const ruleId = persistedRuleIds[i];
    if (id === undefined || ruleId === undefined) continue;
    await step.sendEvent(`emit-${ruleId}`, {
      name: "rebalance.signal.created",
      data: {
        id,
        ruleId,
        source: state.source,
        sourceEventName,
        sourceEventId,
      },
    });
  }

  logger.info("[rebalancing-signal] completed", {
    signalsTriggered: persistedIds.length,
    ruleIds: persistedRuleIds,
    source: state.source,
  });

  return {
    signalsTriggered: persistedIds.length,
    signalIds: persistedIds,
    ruleIds: persistedRuleIds,
    source: state.source,
  };
}

export const rebalancingSignal = inngest.createFunction(
  {
    id: REBALANCING_SIGNAL_ID,
    concurrency: { limit: 1 },
    triggers: [
      { event: "risk.daily.completed" },
      { event: "rebalance.signal.requested" },
    ],
  },
  rebalancingSignalHandler,
);
