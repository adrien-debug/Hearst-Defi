import { PrismaClient } from "@prisma/client";
import { computeMiningRevenue } from "../src/lib/engine/mining";
import { runBacktest } from "../src/lib/engine/backtest";
import { getPresetInputs, runScenario } from "../src/lib/engine/scenario";
import type {
  BacktestKey,
  Preset,
  ScenarioInputs,
  ScenarioOutput,
} from "../src/lib/engine/types";

const prisma = new PrismaClient();

const AUM_USDC = 25_000_000;
const SEED_NOW = new Date("2026-05-14T00:00:00Z");
const PRESETS: Preset[] = [
  "base",
  "btc_bear",
  "btc_bull",
  "mining_compression",
  "extreme_stress",
];
const BACKTEST_KEYS: BacktestKey[] = [
  "bear_2022",
  "etf_halving_2024",
  "mining_crunch_2024",
];

const SNAPSHOT_DATES: Record<Preset, Date> = {
  base: new Date("2026-05-09T12:00:00Z"),
  btc_bear: new Date("2026-05-10T12:00:00Z"),
  btc_bull: new Date("2026-05-11T12:00:00Z"),
  mining_compression: new Date("2026-05-12T12:00:00Z"),
  extreme_stress: new Date("2026-05-13T12:00:00Z"),
};

const MINING_BASE_INPUTS: ScenarioInputs = getPresetInputs("base");
const MINING_MONTHS: Array<{ takenAt: Date; label: string }> = [
  { takenAt: new Date("2025-12-15T00:00:00Z"), label: "2025-12" },
  { takenAt: new Date("2026-01-15T00:00:00Z"), label: "2026-01" },
  { takenAt: new Date("2026-02-15T00:00:00Z"), label: "2026-02" },
  { takenAt: new Date("2026-03-15T00:00:00Z"), label: "2026-03" },
  { takenAt: new Date("2026-04-15T00:00:00Z"), label: "2026-04" },
  { takenAt: new Date("2026-05-15T00:00:00Z"), label: "2026-05" },
];

const APPROVED_BY = JSON.stringify(["multisig:0xAAA", "multisig:0xBBB"]);

interface RebalanceFixture {
  ruleId: string;
  executedAt: Date;
  triggerText: string;
  actionText: string;
  impactText: string;
  fromAllocation: Record<string, number>;
  toAllocation: Record<string, number>;
}

const REBALANCE_FIXTURES: RebalanceFixture[] = [
  {
    ruleId: "R1",
    executedAt: new Date("2026-03-14T15:00:00Z"),
    triggerText: "Risk score crossed 65 threshold (current: 68)",
    actionText: "Shift 5% AUM btc_tactical -> usdc_base",
    impactText: "Lowers volatility exposure; APY low slips to 8.9%",
    fromAllocation: { mining: 35, btc_tactical: 20, usdc_base: 35, stable_reserve: 10 },
    toAllocation: { mining: 35, btc_tactical: 15, usdc_base: 40, stable_reserve: 10 },
  },
  {
    ruleId: "R2",
    executedAt: new Date("2026-03-29T15:00:00Z"),
    triggerText: "Mining margin dropped below 60 (current: 54)",
    actionText: "Rotate 8% AUM mining -> usdc_base",
    impactText: "Reduces hashprice exposure; stabilizes APY low at 9.1%",
    fromAllocation: { mining: 35, btc_tactical: 15, usdc_base: 40, stable_reserve: 10 },
    toAllocation: { mining: 27, btc_tactical: 15, usdc_base: 48, stable_reserve: 10 },
  },
  {
    ruleId: "R3",
    executedAt: new Date("2026-04-13T15:00:00Z"),
    triggerText: "BTC drawdown -22% with vol_index 38 (accumulate window)",
    actionText: "Convert 5% AUM usdc_base -> btc_tactical",
    impactText: "Builds BTC exposure into weakness; target reverts to balanced",
    fromAllocation: { mining: 27, btc_tactical: 15, usdc_base: 48, stable_reserve: 10 },
    toAllocation: { mining: 27, btc_tactical: 20, usdc_base: 43, stable_reserve: 10 },
  },
  {
    ruleId: "R4",
    executedAt: new Date("2026-04-28T15:00:00Z"),
    triggerText: "Mode shifted defensive -> balanced (risk 58, margin 72)",
    actionText: "Rebalance to balanced mode targets",
    impactText: "Restores mining weight; APY range widens to 9.8-12.4%",
    fromAllocation: { mining: 27, btc_tactical: 20, usdc_base: 43, stable_reserve: 10 },
    toAllocation: { mining: 35, btc_tactical: 15, usdc_base: 40, stable_reserve: 10 },
  },
  {
    ruleId: "R5",
    executedAt: new Date("2026-05-12T15:00:00Z"),
    triggerText: "Vol index above 80 sustained 7 days (current: 84)",
    actionText: "Reduce btc_tactical to 50% of mode target",
    impactText: "Caps downside; APY low trims by 30 bps",
    fromAllocation: { mining: 35, btc_tactical: 15, usdc_base: 40, stable_reserve: 10 },
    toAllocation: { mining: 35, btc_tactical: 7, usdc_base: 48, stable_reserve: 10 },
  },
];

interface ProofFixture {
  proofType: string;
  period: string | null;
  postedAt: Date;
  seed: string;
}

const PROOF_FIXTURES: ProofFixture[] = [
  { proofType: "mining_attestation", period: "2026-02", postedAt: new Date("2026-03-03T09:00:00Z"), seed: "mining-2026-02" },
  { proofType: "mining_attestation", period: "2026-03", postedAt: new Date("2026-04-03T09:00:00Z"), seed: "mining-2026-03" },
  { proofType: "mining_attestation", period: "2026-04", postedAt: new Date("2026-05-03T09:00:00Z"), seed: "mining-2026-04" },
  { proofType: "custody", period: "2026-03", postedAt: new Date("2026-04-05T09:00:00Z"), seed: "custody-2026-03" },
  { proofType: "custody", period: "2026-04", postedAt: new Date("2026-05-05T09:00:00Z"), seed: "custody-2026-04" },
  { proofType: "audit", period: "2026-Q1", postedAt: new Date("2026-04-10T09:00:00Z"), seed: "audit-2026-Q1" },
  { proofType: "audit", period: "2026-Q2", postedAt: new Date("2026-05-10T09:00:00Z"), seed: "audit-2026-Q2" },
  { proofType: "methodology", period: null, postedAt: new Date("2026-01-15T09:00:00Z"), seed: "methodology-v1.0" },
];

function hashFor(seed: string): string {
  let h1 = 0x9e3779b1 ^ seed.length;
  let h2 = 0x85ebca77 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x1b873593);
    h2 = Math.imul(h2 ^ c, 0xc2b2ae35);
    h1 = (h1 << 13) | (h1 >>> 19);
    h2 = (h2 << 17) | (h2 >>> 15);
  }
  let hex = "";
  for (let i = 0; i < 4; i++) {
    h1 = Math.imul(h1 ^ (h1 >>> 16), 0x85ebca6b);
    h2 = Math.imul(h2 ^ (h2 >>> 13), 0xc2b2ae35);
    const w1 = (h1 ^ (h1 >>> 16)) >>> 0;
    const w2 = (h2 ^ (h2 >>> 16)) >>> 0;
    hex += w1.toString(16).padStart(8, "0");
    hex += w2.toString(16).padStart(8, "0");
  }
  return "0x" + hex.slice(0, 64);
}

function ipfsUriFor(hash: string): string {
  const body = hash.replace(/^0x/, "").slice(0, 44);
  return `ipfs://Qm${body}`;
}

async function resetTables(): Promise<void> {
  await prisma.allocation.deleteMany();
  await prisma.vaultSnapshot.deleteMany();
  await prisma.backtestRun.deleteMany();
  await prisma.rebalanceEvent.deleteMany();
  await prisma.miningMetric.deleteMany();
  await prisma.proof.deleteMany();
}

async function seedVaultSnapshots(): Promise<{ snapshots: number; allocations: number }> {
  let snapshots = 0;
  let allocations = 0;
  for (const preset of PRESETS) {
    const inputs = getPresetInputs(preset);
    const output: ScenarioOutput = runScenario(inputs, { preset, now: SEED_NOW });
    const snap = await prisma.vaultSnapshot.create({
      data: {
        takenAt: SNAPSHOT_DATES[preset],
        aumUsdc: AUM_USDC,
        currentApyLow: output.apy_range.low,
        currentApyHigh: output.apy_range.high,
        stressedApy: output.stressed_apy,
        riskScore: output.risk_score,
        miningMarginScore: output.mining_margin_score,
        mode: output.mode,
        source: "computed",
      },
    });
    snapshots++;
    for (const a of output.allocations) {
      await prisma.allocation.create({
        data: {
          snapshotId: snap.id,
          bucket: a.bucket,
          pct: a.pct,
          valueUsdc: AUM_USDC * (a.pct / 100),
          yieldContributionBps: a.yield_contribution_bps,
        },
      });
      allocations++;
    }
  }
  return { snapshots, allocations };
}

async function seedBacktests(): Promise<number> {
  let count = 0;
  for (const key of BACKTEST_KEYS) {
    const out = runBacktest(key, { now: SEED_NOW });
    await prisma.backtestRun.create({
      data: {
        backtestKey: key,
        ranAt: SEED_NOW,
        initialCapital: out.initialCapital,
        rulesMode: "hearst_rules",
        endingValue: out.endingValue,
        totalReturnPct: out.totalReturnPct,
        maxDrawdownPct: out.maxDrawdownPct,
        worstMonthPct: out.worstMonthPct,
        numRebalances: out.numRebalances,
        monthlySeries: JSON.stringify(out.monthlySeries),
        narrative: null,
      },
    });
    count++;
  }
  return count;
}

async function seedMiningMetrics(): Promise<number> {
  const baseHashprice = MINING_BASE_INPUTS.hashprice_usd_th_day;
  let prevHashprice: number | null = null;
  let count = 0;
  for (let i = 0; i < MINING_MONTHS.length; i++) {
    const entry = MINING_MONTHS[i];
    if (!entry) continue;
    const hashprice = Number((baseHashprice * (1 + 0.01 * (i - 3))).toFixed(6));
    const monthlyInputs: ScenarioInputs = { ...MINING_BASE_INPUTS, hashprice_usd_th_day: hashprice };
    const revenue = computeMiningRevenue(monthlyInputs);
    const hashpriceTrendPct =
      prevHashprice === null
        ? 0
        : Number((((hashprice - prevHashprice) / prevHashprice) * 100).toFixed(2));
    await prisma.miningMetric.create({
      data: {
        takenAt: entry.takenAt,
        hashprice,
        difficulty: 110e12,
        btcPrice: 95000,
        energyCost: monthlyInputs.energy_cost_kwh,
        uptimePct: 99.2,
        deployedHashrate: 2500,
        miningMarginScore: Math.round(revenue.margin_score),
        hashpriceTrendPct,
        operationalConfidence: 85,
      },
    });
    prevHashprice = hashprice;
    count++;
  }
  return count;
}

async function seedRebalanceEvents(): Promise<number> {
  let count = 0;
  for (const ev of REBALANCE_FIXTURES) {
    await prisma.rebalanceEvent.create({
      data: {
        executedAt: ev.executedAt,
        ruleId: ev.ruleId,
        triggerText: ev.triggerText,
        actionText: ev.actionText,
        impactText: ev.impactText,
        fromAllocation: JSON.stringify(ev.fromAllocation),
        toAllocation: JSON.stringify(ev.toAllocation),
        txHash: null,
        approvedBy: APPROVED_BY,
      },
    });
    count++;
  }
  return count;
}

async function seedProofs(): Promise<number> {
  let count = 0;
  for (const p of PROOF_FIXTURES) {
    const hash = hashFor(p.seed);
    await prisma.proof.create({
      data: {
        proofType: p.proofType,
        period: p.period,
        hash,
        uri: ipfsUriFor(hash),
        postedAt: p.postedAt,
        postedBy: "ops@hearst.connect",
        txHash: null,
      },
    });
    count++;
  }
  return count;
}

async function main(): Promise<void> {
  await resetTables();
  const vault = await seedVaultSnapshots();
  const backtests = await seedBacktests();
  const miningMetrics = await seedMiningMetrics();
  const rebalances = await seedRebalanceEvents();
  const proofs = await seedProofs();

  console.log("Hearst Connect seed complete:");
  console.log(`  VaultSnapshot:   ${vault.snapshots}`);
  console.log(`  Allocation:      ${vault.allocations}`);
  console.log(`  BacktestRun:     ${backtests}`);
  console.log(`  MiningMetric:    ${miningMetrics}`);
  console.log(`  RebalanceEvent:  ${rebalances}`);
  console.log(`  Proof:           ${proofs}`);
}

main()
  .catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
