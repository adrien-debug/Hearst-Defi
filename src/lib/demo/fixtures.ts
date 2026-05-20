import "server-only";

import type {
  DashboardData,
  DashboardAllocation,
  DashboardRecentEvent,
  DashboardVault,
  DashboardTimeseries,
} from "@/lib/data/dashboard";
import type { PortfolioData } from "@/lib/data/portfolio";
import type { VaultProduct } from "@/lib/data/vaults";
import type { BtcPriceData } from "@/lib/data/btc-price";
import type { HashpriceData } from "@/lib/data/hashprice";
import type {
  RiskDimension,
  RiskFrameworkData,
} from "@/lib/data/risk-framework";
import type { AdvancedMetricsData } from "@/lib/data/advanced-metrics";
import type { ProofItem } from "@/lib/mock/proof-center";
import type { PositionDetail } from "@/lib/data/portfolio";
import type { DistributionSnapshot } from "@/lib/agents/loaders/distribution";
import type { MiningOpsSnapshot } from "@/lib/agents/loaders/mining";
import type { VaultMonthlyRow } from "@/lib/agents/loaders/vault";

/**
 * Deterministic fixtures for demo mode.
 *
 * All values are hand-tuned to a plausible institutional vault profile:
 *   - AUM around $42.5M
 *   - APY range 9.4–12.8% (non-negotiable #1 — never a single point)
 *   - PTAI-formatted rebalance events (non-negotiable #3)
 *   - Composite risk 42/100 → Low–Moderate
 *   - Mining margin 72/100 with operational confidence 84%
 *
 * Strict invariants enforced by the companion test file:
 *   - NO forbidden words anywhere in user-facing strings
 *     ("guarantee", "promise", "certain", "will deliver", "risk-free", "no risk")
 *   - APY values are always exposed as a range
 *   - Every Date is anchored to `DEMO_AS_OF` (no `Date.now()` / `new Date()`
 *     at module load — these fixtures must be byte-for-byte stable).
 */

// ---------------------------------------------------------------------------
// Stable anchor — every Date in this file is computed deterministically from
// this constant. Refresh manually when the demo fixture set is intentionally
// re-versioned (e.g. quarterly).
// ---------------------------------------------------------------------------

/** ISO 8601, UTC. */
const DEMO_AS_OF_ISO = "2026-05-20T09:00:00Z";
const DEMO_AS_OF = new Date(DEMO_AS_OF_ISO);

/** Convenience: produce a Date `n` days before the demo anchor. */
function daysBefore(n: number): Date {
  return new Date(DEMO_AS_OF.getTime() - n * 24 * 60 * 60 * 1000);
}

/** UTC ISO date `YYYY-MM-DD` from a Date. */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Vault hero
// ---------------------------------------------------------------------------

const DEMO_AUM_USDC = 42_500_000;
const DEMO_DELTA_30D_USDC = 1_200_000;
const DEMO_APY_LOW = 9.4;
const DEMO_APY_HIGH = 12.8;

const DEMO_VAULT: DashboardVault = {
  aumUsdc: DEMO_AUM_USDC,
  delta30dUsdc: DEMO_DELTA_30D_USDC,
  apyRange: { low: DEMO_APY_LOW, high: DEMO_APY_HIGH },
  stressedApy: 5.6,
  riskScore: 42,
  miningMarginScore: 72,
  mode: "balanced",
  asOf: DEMO_AS_OF,
};

// ---------------------------------------------------------------------------
// Allocations — 60 / 25 / 10 / 5 across the four canonical buckets.
// yieldContributionBps is the *sleeve contribution* (sleeve APY % × sleeve
// pct × 100), aligned with how the dashboard computes the blended yield.
// ---------------------------------------------------------------------------

const DEMO_ALLOCATIONS: DashboardAllocation[] = [
  {
    bucket: "mining",
    pct: 60,
    valueUsdc: DEMO_AUM_USDC * 0.6,
    // 11.5% sleeve APY × 60% weight × 100 = 690 bps contribution
    yieldContributionBps: 690,
  },
  {
    bucket: "btc_tactical",
    pct: 25,
    valueUsdc: DEMO_AUM_USDC * 0.25,
    // BTC sleeve is held for delta, not yield
    yieldContributionBps: 0,
  },
  {
    bucket: "usdc_base",
    pct: 10,
    valueUsdc: DEMO_AUM_USDC * 0.1,
    // 5.2% × 10% × 100 = 52 bps
    yieldContributionBps: 52,
  },
  {
    bucket: "stable_reserve",
    pct: 5,
    valueUsdc: DEMO_AUM_USDC * 0.05,
    // 4.5% × 5% × 100 = 22.5 → 23 bps
    yieldContributionBps: 23,
  },
];

// ---------------------------------------------------------------------------
// Mining ops + market context
// ---------------------------------------------------------------------------

const DEMO_HASHPRICE: HashpriceData = {
  usd_per_th_day: 0.058,
  difficulty: 1.32e14,
  btc_price_usd: 96_000,
  block_reward_btc: 3.125,
  fetched_at: DEMO_AS_OF,
  stale: false,
};

const DEMO_MINING_OPS: MiningOpsSnapshot = {
  hashrate_ph_s: 184.5,
  uptime_pct: 98.7,
  margin_score: 72,
  attestations_count: 5,
  hashprice: DEMO_HASHPRICE,
};

const DEMO_BTC_PRICE: BtcPriceData = {
  usd: 96_000,
  usd_24h_change: 1.4,
  fetched_at: DEMO_AS_OF,
  stale: false,
};

// ---------------------------------------------------------------------------
// Rebalance events — PTAI format (Projection → Trigger → Action → Impact).
// Non-negotiable #3 enforced by the fixtures test below.
// ---------------------------------------------------------------------------

const DEMO_RECENT_EVENTS: DashboardRecentEvent[] = [
  {
    id: "demo-evt-01",
    ruleId: "R-MARGIN-COMPRESSION",
    takenAt: daysBefore(4),
    triggerText:
      "Trigger: hashprice 7d trend −4.2%, mining margin score crossed 70 threshold.",
    actionText:
      "Action: reduced mining sleeve from 64% to 60%, redeployed 4 pts into usdc_base.",
    impactText:
      "Impact: APY range tightened to 9.4–12.8%, stressed APY held at 5.6%.",
  },
  {
    id: "demo-evt-02",
    ruleId: "R-BTC-VOL-BAND",
    takenAt: daysBefore(11),
    triggerText:
      "Trigger: realised vol on BTC sleeve climbed past the 35-vol guardrail (38v).",
    actionText:
      "Action: trimmed btc_tactical from 28% to 25%, parked 3 pts in stable_reserve.",
    impactText:
      "Impact: portfolio beta to BTC reduced from 0.31 to 0.24, drawdown buffer +180k USDC.",
  },
  {
    id: "demo-evt-03",
    ruleId: "R-DIST-CADENCE",
    takenAt: daysBefore(18),
    triggerText:
      "Trigger: monthly distribution cadence due for April 2026 period.",
    actionText:
      "Action: wired 358,000 USDC to LP wallets from the stable_reserve sleeve.",
    impactText:
      "Impact: realised yield 9.8% annualised, sleeve replenished from mining cashflows.",
  },
  {
    id: "demo-evt-04",
    ruleId: "R-LIQUIDITY-FLOOR",
    takenAt: daysBefore(27),
    triggerText:
      "Trigger: redemption queue at 1.4% of AUM, stable_reserve sleeve below 6%.",
    actionText:
      "Action: rotated 1.5% of usdc_base back into stable_reserve to refill the 5% floor.",
    impactText:
      "Impact: 60-day soft lock-up coverage restored to 1.8×, no impact on APY range.",
  },
  {
    id: "demo-evt-05",
    ruleId: "R-MINING-ATTEST",
    takenAt: daysBefore(36),
    triggerText:
      "Trigger: April mining attestation posted by ops multisig (3/5 signers).",
    actionText:
      "Action: hash 0xab12…f9c3 pinned to IPFS, mirrored on the off-chain proof grid.",
    impactText:
      "Impact: attestation cadence on track, op confidence rose from 82% to 84%.",
  },
];

// ---------------------------------------------------------------------------
// 30-day timeseries — smooth deterministic curve growing from
// `aum - delta30d` to `aum`, APY band oscillating inside the methodology
// target window.
// ---------------------------------------------------------------------------

const TIMESERIES_POINTS = 30;

function buildDemoTimeseries(): DashboardTimeseries {
  const endAum = DEMO_AUM_USDC;
  const startAum = endAum - DEMO_DELTA_30D_USDC;
  const nav30d: DashboardTimeseries["nav30d"] = [];
  const apy30d: DashboardTimeseries["apy30d"] = [];

  // Anchor the series to the day BEFORE the demo `asOf` so the last point
  // matches the hero (no future-dated rows).
  const lastDay = new Date(
    Date.UTC(
      DEMO_AS_OF.getUTCFullYear(),
      DEMO_AS_OF.getUTCMonth(),
      DEMO_AS_OF.getUTCDate(),
    ),
  );

  for (let i = TIMESERIES_POINTS - 1; i >= 0; i--) {
    const t = (TIMESERIES_POINTS - 1 - i) / (TIMESERIES_POINTS - 1); // 0..1
    const wiggle = Math.sin(t * Math.PI * 3) * (endAum * 0.008);
    const aum = Math.round(startAum + (endAum - startAum) * t + wiggle);

    const mid = 11 + Math.sin(t * Math.PI * 2.4) * 0.7;
    const apy_low = Math.round((mid - 1.6) * 10) / 10;
    const apy_high = Math.round((mid + 1.2) * 10) / 10;

    const d = new Date(lastDay.getTime() - i * 24 * 60 * 60 * 1000);
    const date = toIsoDate(d);
    nav30d.push({ date, aum_usdc: aum });
    apy30d.push({ date, apy_low, apy_high });
  }

  return { nav30d, apy30d, source: "db" };
}

// ---------------------------------------------------------------------------
// Distribution + 6-month monthly history
// ---------------------------------------------------------------------------

const DEMO_LATEST_DISTRIBUTION: DistributionSnapshot = {
  period: "2026-04",
  amount_usdc: 358_000,
  paid_at: new Date(Date.UTC(2026, 4, 1, 12, 0, 0)), // 2026-05-01 (May 1, T+1 of April close)
  status: "paid",
};

const DEMO_MONTHLY_HISTORY: VaultMonthlyRow[] = [
  {
    period: "2025-12",
    apy_low: 9.1,
    apy_high: 12.4,
    apy_achieved: 10.6,
    nav_usdc: 38_100_000,
    distribution_usdc: 305_000,
  },
  {
    period: "2026-01",
    apy_low: 9.2,
    apy_high: 12.5,
    apy_achieved: 10.8,
    nav_usdc: 39_400_000,
    distribution_usdc: 315_000,
  },
  {
    period: "2026-02",
    apy_low: 9.3,
    apy_high: 12.6,
    apy_achieved: 11.0,
    nav_usdc: 40_600_000,
    distribution_usdc: 325_000,
  },
  {
    period: "2026-03",
    apy_low: 9.3,
    apy_high: 12.7,
    apy_achieved: 11.1,
    nav_usdc: 41_500_000,
    distribution_usdc: 340_000,
  },
  {
    period: "2026-04",
    apy_low: 9.4,
    apy_high: 12.8,
    apy_achieved: 11.3,
    nav_usdc: 42_100_000,
    distribution_usdc: 358_000,
  },
  {
    period: "2026-05",
    apy_low: 9.4,
    apy_high: 12.8,
    apy_achieved: 11.4,
    nav_usdc: 42_500_000,
    distribution_usdc: 364_000,
  },
];

// ---------------------------------------------------------------------------
// Public — DashboardData
// ---------------------------------------------------------------------------

export const DEMO_DASHBOARD_DATA: DashboardData = {
  vault: DEMO_VAULT,
  allocations: DEMO_ALLOCATIONS,
  miningOps: DEMO_MINING_OPS,
  hashpriceTrendPct: -3.2,
  operationalConfidence: 84,
  latestDistribution: DEMO_LATEST_DISTRIBUTION,
  monthlyHistory: DEMO_MONTHLY_HISTORY,
  btcPrice: DEMO_BTC_PRICE,
  recentEvents: DEMO_RECENT_EVENTS,
  timeseries: buildDemoTimeseries(),
  source: "db",
};

// ---------------------------------------------------------------------------
// Risk framework — composite 42 = Low–Moderate band. 5 dimensions, hand-tuned
// so each lands in the healthy/medium severity bucket per the thresholds in
// `src/lib/data/risk-framework.ts`.
// ---------------------------------------------------------------------------

const DEMO_RISK_DIMENSIONS: RiskDimension[] = [
  {
    id: "smart_contract",
    label: "Smart Contract",
    score: 35,
    status: "AUDITED",
    severity: "low",
    detail:
      "Audited contracts; production exposure < 6 months, Spearbit review on file.",
  },
  {
    id: "mining",
    label: "Mining Operations",
    score: 28,
    status: "STABLE",
    severity: "low",
    detail:
      "Margin score 72/100 — fleet economics comfortably above target band.",
  },
  {
    id: "counterparty",
    label: "Counterparty",
    score: 26,
    status: "OPTIMAL",
    severity: "low",
    detail:
      "Mining partner + custodian diversified; attestations on cadence (3/5 multisig).",
  },
  {
    id: "market",
    label: "Market",
    score: 48,
    status: "ELEVATED",
    severity: "medium",
    detail:
      "BTC vol index 50/100; tactical sleeve sized within risk budget.",
  },
  {
    id: "liquidity",
    label: "Liquidity",
    score: 34,
    status: "HEALTHY",
    severity: "low",
    detail:
      "Stable reserve sleeve sized for 60-day soft lock-up window.",
  },
];

export const DEMO_RISK_FRAMEWORK: RiskFrameworkData = {
  composite: 42,
  band: "low",
  bandLabel: "Low–Moderate",
  dimensions: DEMO_RISK_DIMENSIONS,
  source: "db",
};

// ---------------------------------------------------------------------------
// Standalone live signals
// ---------------------------------------------------------------------------

export { DEMO_HASHPRICE, DEMO_BTC_PRICE };

// ---------------------------------------------------------------------------
// Portfolio position constants — declared here so DEMO_POSITION_DETAIL and
// DEMO_PORTFOLIO_DATA can both reference them without temporal dead zone.
// ---------------------------------------------------------------------------

const DEMO_POSITION_PRINCIPAL = 500_000;
const DEMO_POSITION_ACCRUED = 19_250;   // ~11.1% annualised × 5.5 months
const DEMO_POSITION_DISTRIBUTED = 27_300; // 3 monthly distributions paid

// ---------------------------------------------------------------------------
// PositionDetail — for /portfolio/[positionId]
// APY range non-negotiable #1 — always as a range, never a single point.
// No forbidden words (#5): no "guarantee", "promise", "certain", "risk-free".
// ---------------------------------------------------------------------------

export const DEMO_POSITION_DETAIL: PositionDetail = {
  id: "demo-pos-001",
  vaultName: "Hearst Yield Vault",
  vaultTicker: "HYV-A",
  status: "active",
  principalUsdc: DEMO_POSITION_PRINCIPAL,
  accruedYieldUsdc: DEMO_POSITION_ACCRUED,
  distributedUsdc: DEMO_POSITION_DISTRIBUTED,
  realizedApyLow: DEMO_APY_LOW,
  realizedApyHigh: DEMO_APY_HIGH,
  subscribedAt: daysBefore(168),
  maturedAt: null,
  txHashOpen: "0xdemo01ab23cd45ef6789ab12cd34ef5678901234567890abcdef1234567890ab",
  transactions: [
    {
      id: "demo-tx-05",
      type: "distribution",
      amountUsdc: 9_200,
      occurredAt: daysBefore(19),
      txHash: null,
    },
    {
      id: "demo-tx-04",
      type: "distribution",
      amountUsdc: 9_100,
      occurredAt: daysBefore(49),
      txHash: null,
    },
    {
      id: "demo-tx-03",
      type: "distribution",
      amountUsdc: 9_000,
      occurredAt: daysBefore(80),
      txHash: null,
    },
    {
      id: "demo-tx-02",
      type: "claim",
      amountUsdc: 4_800,
      occurredAt: daysBefore(112),
      txHash: null,
    },
    {
      id: "demo-tx-01",
      type: "deposit",
      amountUsdc: DEMO_POSITION_PRINCIPAL,
      occurredAt: daysBefore(168),
      txHash: "0xdemo01ab23cd45ef6789ab12cd34ef5678901234567890abcdef1234567890ab",
    },
  ],
  source: "live",
};

// ---------------------------------------------------------------------------
// Proofs — 8 entries across all four ProofType variants, spread across the
// last six months so the Proof Center grid and filters render meaningfully.
// ---------------------------------------------------------------------------

export const DEMO_PROOFS: ProofItem[] = [
  {
    id: "demo-ma-2026-04",
    proofType: "mining_attestation",
    period: "2026-04",
    title: "Mining attestation · 2026-04",
    hash: "0xab12cd34ef5678901234567890abcdef1234567890abcdef1234567890abf9c3",
    uri: "ipfs://bafybeib2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3f4g5h6demo01",
    postedAt: "2026-05-02T09:14:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "demo-ma-2026-03",
    proofType: "mining_attestation",
    period: "2026-03",
    title: "Mining attestation · 2026-03",
    hash: "0x71f2a9c8e4b6d7531fa2c4d5e6f70819203a4b5c6d7e8f90a1b2c3d4e5f6demo",
    uri: "ipfs://bafybeih4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9demo02",
    postedAt: "2026-04-03T11:22:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "demo-ma-2026-02",
    proofType: "mining_attestation",
    period: "2026-02",
    title: "Mining attestation · 2026-02",
    hash: "0x4c8d2f1a3b5e7c9d0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4demo",
    uri: "ipfs://bafybeie7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9b0c1d2e3demo03",
    postedAt: "2026-03-04T10:01:00Z",
    postedBy: "Multisig 3/5 · ops@hearst",
    txHash: null,
  },
  {
    id: "demo-cust-2026-04",
    proofType: "custody",
    period: "2026-04",
    title: "Custody proof-of-reserves snapshot · 2026-04",
    hash: "0x9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2demo",
    uri: "https://por.hearst.io/snapshots/2026-04-30.json",
    postedAt: "2026-05-01T00:05:00Z",
    postedBy: "Fireblocks signer · custody@hearst",
    txHash: null,
  },
  {
    id: "demo-cust-2026-03",
    proofType: "custody",
    period: "2026-03",
    title: "Custody proof-of-reserves snapshot · 2026-03",
    hash: "0x12abf45c6d7e8f90a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2demo",
    uri: "https://por.hearst.io/snapshots/2026-03-31.json",
    postedAt: "2026-04-01T00:07:00Z",
    postedBy: "Fireblocks signer · custody@hearst",
    txHash: null,
  },
  {
    id: "demo-audit-spearbit-2026q1",
    proofType: "audit",
    period: null,
    title: "Spearbit smart-contract review · vault skeleton",
    hash: "0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7edemo",
    uri: "https://reports.spearbit.com/hearst-vault-2026q1.pdf",
    postedAt: "2026-03-18T15:30:00Z",
    postedBy: "Spearbit · external",
    txHash: null,
  },
  {
    id: "demo-audit-trail-2026q1",
    proofType: "audit",
    period: null,
    title: "Trail of Bits scoping memo · Phase 2 EventLogger",
    hash: "0x55667788aabbccddeeff00112233445566778899aabbccddeeff001122334demo",
    uri: "https://reports.trailofbits.com/hearst-eventlogger-scope.pdf",
    postedAt: "2026-02-27T13:00:00Z",
    postedBy: "Trail of Bits · external",
    txHash: null,
  },
  {
    id: "demo-method-v1-0",
    proofType: "methodology",
    period: null,
    title: "Methodology v1.0 — vault yield + risk model",
    hash: "0xfeedcafe0123456789abcdeffeedcafe0123456789abcdeffeedcafe0123demo",
    uri: "ipfs://bafybeia1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6methodemo",
    postedAt: "2026-01-14T17:45:00Z",
    postedBy: "Hearst research · v1.0",
    txHash: null,
  },
];

// ---------------------------------------------------------------------------
// Advanced metrics — institutional ratios for the dashboard.
//
// Values picked to be plausible for a mining-backed vault: Sharpe in the
// 1.2–1.6 band, Sortino higher (mining cashflows skew the downside thin),
// VaR 95% around 3% monthly loss, drawdown ~7%, Calmar finite.
// ---------------------------------------------------------------------------

export const DEMO_ADVANCED_METRICS: AdvancedMetricsData = {
  available: true,
  monthsUsed: 24,
  provenance: "partial",
  sharpe: 1.4,
  sortino: 2.1,
  // 3.2% monthly loss at 95% confidence, expressed as positive decimal.
  varDecimal: 0.032,
  // 6.8% max drawdown over the 24m window.
  maxDrawdownDecimal: 0.068,
  calmar: 1.7,
  calmarFinite: true,
};

// ---------------------------------------------------------------------------
// Vault product — single MVP vault fixture (CLAUDE.md non-negotiable #9).
// APY as a range (#1). Disclaimers from methodology v1.0 (#10).
// No forbidden words (#5): no "guarantee", "promise", "certain", "risk-free".
// ---------------------------------------------------------------------------

export const DEMO_VAULT_PRODUCT: VaultProduct = {
  id: "hearst-yield-vault",
  ticker: "HYV-A",
  name: "Hearst Yield Vault",
  description:
    "Mining-backed structured yield with monthly USDC distributions. The vault allocates across four sleeves: Bitcoin mining operations, BTC tactical delta, USDC base lending, and stable reserve — dynamically rebalanced by rule-based triggers.",
  strategy: "mining_yield",
  status: "live",
  apyLow: 9.4,
  apyHigh: 12.8,
  minTicketUsdc: 250_000,
  softLockupDays: 60,
  capacityUsdc: 100_000_000,
  currentAumUsdc: 42_500_000,
  fees: { mgmtBps: 200, perfBps: 1000, hurdleBps: 0 },
  riskLevel: "low-moderate",
  spvJurisdiction: "cayman",
  shareClass: "A",
  regExemption: "regS",
  disclaimers:
    "Projections are conditional on stated assumptions. Past performance does not indicate future results. Hearst Yield Vault is offered exclusively to professional / qualified investors via a Cayman Exempted Limited Partnership. Subject to minimum subscription, soft lock-up, and jurisdictional restrictions. Not an offer or solicitation where prohibited.",
  targetMiningBps: 6000,
  targetBtcTacticalBps: 2500,
  targetUsdcBaseBps: 1000,
  targetStableReserveBps: 500,
};

export const DEMO_VAULT_LIST: VaultProduct[] = [DEMO_VAULT_PRODUCT];

// ---------------------------------------------------------------------------
// Portfolio — demo investor position
// ---------------------------------------------------------------------------
export const DEMO_PORTFOLIO_DATA: PortfolioData = {
  positions: [
    {
      id: "demo-pos-001",
      vaultName: "Hearst Yield Vault",
      principalUsdc: DEMO_POSITION_PRINCIPAL,
      accruedYieldUsdc: DEMO_POSITION_ACCRUED,
      distributedUsdc: DEMO_POSITION_DISTRIBUTED,
      valueUsdc: DEMO_POSITION_PRINCIPAL + DEMO_POSITION_ACCRUED,
      status: "active",
      apyLow: 9.4,
      apyHigh: 12.8,
      subscribedAt: daysBefore(168), // subscribed ~6 months ago
    },
  ],
  totalValueUsdc: DEMO_POSITION_PRINCIPAL + DEMO_POSITION_ACCRUED,
  totalYieldYtdUsdc: DEMO_POSITION_ACCRUED + DEMO_POSITION_DISTRIBUTED,
  nextDistributionAt: new Date(Date.UTC(2026, 5, 1, 0, 0, 0)), // 2026-06-01
  recentTransactions: [
    {
      id: "demo-tx-05",
      type: "distribution",
      amountUsdc: 9_200,
      occurredAt: daysBefore(19),
      txHash: null,
      positionVaultName: "Hearst Yield Vault",
    },
    {
      id: "demo-tx-04",
      type: "distribution",
      amountUsdc: 9_100,
      occurredAt: daysBefore(49),
      txHash: null,
      positionVaultName: "Hearst Yield Vault",
    },
    {
      id: "demo-tx-03",
      type: "distribution",
      amountUsdc: 9_000,
      occurredAt: daysBefore(80),
      txHash: null,
      positionVaultName: "Hearst Yield Vault",
    },
    {
      id: "demo-tx-02",
      type: "claim",
      amountUsdc: 4_800,
      occurredAt: daysBefore(112),
      txHash: null,
      positionVaultName: "Hearst Yield Vault",
    },
    {
      id: "demo-tx-01",
      type: "deposit",
      amountUsdc: DEMO_POSITION_PRINCIPAL,
      occurredAt: daysBefore(168),
      txHash: "0xdemo01ab23cd45ef6789ab12cd34ef5678901234567890abcdef1234567890ab",
      positionVaultName: "Hearst Yield Vault",
    },
  ],
  source: "live",
};
