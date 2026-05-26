import "server-only";

import { prisma } from "@/lib/db";
import { listAllVaults } from "@/lib/vaults/resolver";
import { vaultLabel } from "@/lib/vaults/slug";

// =============================================================================
// Cockpit Admin Dashboard — data loaders.
//
// All functions in this module are server-only. They supply the 3-column
// cockpit layout:  Action Queue | Live Metrics | Live Ops  + Hero Strip + Audit Trail.
//
// Philosophy: prefer real Prisma data where available; fall back to a typed
// stub/mock so the UI never crashes on an empty dev DB.
// =============================================================================

// ---------------------------------------------------------------------------
// Types — Action Queue
// ---------------------------------------------------------------------------

export type ActionSeverity = "P0" | "P1" | "P2";

export type ActionType =
  | "multisig.sign"
  | "oracle.stale"
  | "vault.paused"
  | "distribution.approve"
  | "kyc.review"
  | "lp.redemption"
  | "rebalance.signal"
  | "memo.publish"
  | "mining.margin.red"
  | "attestation.overdue";

export interface ActionQueueItem {
  id: string;
  type: ActionType;
  severity: ActionSeverity;
  title: string;
  context: string;
  href?: string;
  /** ISO string */
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Types — Hero Strip KPIs
// ---------------------------------------------------------------------------

export interface HeroKpi {
  label: string;
  value: string;
  sublabel: string;
  provenance: "live" | "oracle" | "attested" | "estimated" | "manual" | "stale";
  /** true when value represents an alert / degraded state */
  alert?: boolean;
}

// ---------------------------------------------------------------------------
// Types — Live Metrics
// ---------------------------------------------------------------------------

export interface VaultLiveMetric {
  vaultId: string;
  vaultName: string;
  tvlUsdc: number;
  miningMarginScore: number;
  riskScore: number;
  /** milliseconds since last oracle update; null = unknown */
  oracleDelayMs: number | null;
  /** "neutral" | "long" | "short" | "hedge" */
  btcPosture: string;
  /** "live" | "paused" | "review" | "draft" | "closed" */
  status: string;
}

// ---------------------------------------------------------------------------
// Types — Live Ops
// ---------------------------------------------------------------------------

export type InngestJobStatus = "ok" | "err" | "pending" | "unknown";

export interface InngestJob {
  id: string;
  name: string;
  status: InngestJobStatus;
  /** last run ISO string or null */
  lastRunAt: string | null;
  /** error message if status === "err" */
  errorMsg: string | null;
}

export interface SentryStats {
  errors24h: number;
  warnings24h: number;
}

export interface OnChainEvent {
  id: string;
  type: "deposit" | "sign" | "swap" | "oracle_update" | "other";
  label: string;
  /** ISO string */
  occurredAt: string;
  txHash?: string;
}

// ---------------------------------------------------------------------------
// Types — Audit Trail
// ---------------------------------------------------------------------------

export interface AuditTrailEntry {
  id: string;
  occurredAt: string;
  actorWallet: string;
  action: string;
  entityType: string;
  entityId: string;
}

// ---------------------------------------------------------------------------
// Types — Full Cockpit payload
// ---------------------------------------------------------------------------

export interface CockpitPayload {
  heroKpis: HeroKpi[];
  actionQueue: ActionQueueItem[];
  vaultMetrics: VaultLiveMetric[];
  inngestJobs: InngestJob[];
  sentryStats: SentryStats;
  onChainEvents: OnChainEvent[];
  auditTrail: AuditTrailEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Stub Inngest job status.
// Inngest does not expose a public REST API for job health without its
// cloud dashboard; until we wire up a webhook / DB ping, we surface "unknown"
// for every job and let operators click through to the Inngest dashboard.
// ---------------------------------------------------------------------------

const INNGEST_JOB_STUBS: InngestJob[] = [
  { id: "rebalance", name: "Rebalance signal", status: "unknown", lastRunAt: null, errorMsg: null },
  { id: "distrib", name: "Distribution", status: "unknown", lastRunAt: null, errorMsg: null },
  { id: "oracle", name: "Oracle sync", status: "unknown", lastRunAt: null, errorMsg: null },
  { id: "proof-sync", name: "Proof sync", status: "unknown", lastRunAt: null, errorMsg: null },
];

// ---------------------------------------------------------------------------
// Infer Inngest job status from LlmRun history (proxy heuristic).
// Recent successful run within 2h → ok; recent failure → err; else unknown.
// ---------------------------------------------------------------------------

async function inferInngestJobs(): Promise<InngestJob[]> {
  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2h ago
    const recentRuns = await prisma.llmRun.findMany({
      where: { createdAt: { gte: cutoff } },
      orderBy: { createdAt: "desc" },
      select: { agentName: true, status: true, createdAt: true },
      take: 100,
    });

    // Map agent names → canonical job ids
    const agentToJob: Record<string, string> = {
      "rebalancing-signal": "rebalance",
      "rebalance": "rebalance",
      "distribution": "distrib",
      "investor-memo": "distrib",
      "oracle": "oracle",
      "market-data": "oracle",
      "proof-sync": "proof-sync",
    };

    const jobMap = new Map<string, { status: InngestJobStatus; lastRunAt: string; errorMsg: string | null }>();

    for (const run of recentRuns) {
      const jobId = agentToJob[run.agentName] ?? null;
      if (!jobId || jobMap.has(jobId)) continue;
      const s: InngestJobStatus =
        run.status === "success" ? "ok" : run.status === "failed" ? "err" : "pending";
      jobMap.set(jobId, {
        status: s,
        lastRunAt: run.createdAt.toISOString(),
        errorMsg: run.status === "failed" ? `Last run failed (${run.agentName})` : null,
      });
    }

    return INNGEST_JOB_STUBS.map((stub) => {
      const found = jobMap.get(stub.id);
      if (!found) return stub;
      return { ...stub, ...found };
    });
  } catch {
    return INNGEST_JOB_STUBS;
  }
}

// ---------------------------------------------------------------------------
// Infer Sentry-equivalent stats from LlmRun failure counts (24h window).
// Replace with a real Sentry API call once the DSN is wired up.
// ---------------------------------------------------------------------------

async function inferSentryStats(): Promise<SentryStats> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [errors, timeouts] = await Promise.all([
      prisma.llmRun.count({ where: { status: "failed", createdAt: { gte: since } } }),
      prisma.llmRun.count({ where: { status: "timeout", createdAt: { gte: since } } }),
    ]);
    return { errors24h: errors, warnings24h: timeouts };
  } catch {
    return { errors24h: 0, warnings24h: 0 };
  }
}

// ---------------------------------------------------------------------------
// Derive action queue from live Prisma data.
// ---------------------------------------------------------------------------

async function buildActionQueue(): Promise<ActionQueueItem[]> {
  const items: ActionQueueItem[] = [];
  const now = new Date();

  try {
    // ── P0: Mining margin red (latest snapshot miningMarginScore < 15) ──────
    const latestSnapshot = await prisma.vaultSnapshot.findFirst({
      orderBy: { takenAt: "desc" },
    });
    if (latestSnapshot && latestSnapshot.miningMarginScore < 15) {
      items.push({
        id: "mining-margin-red",
        type: "mining.margin.red",
        severity: "P0",
        title: "Mining margin critical",
        context: `Margin score ${latestSnapshot.miningMarginScore}/100 — below 15 threshold`,
        href: "/admin/dashboard",
        createdAt: latestSnapshot.takenAt.toISOString(),
      });
    }

    // ── P0: Oracle stale (latest MiningMetric > 6h old) ─────────────────────
    const latestMetric = await prisma.miningMetric.findFirst({
      orderBy: { takenAt: "desc" },
    });
    const staleCutoff6h = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    if (!latestMetric || latestMetric.takenAt < staleCutoff6h) {
      items.push({
        id: "oracle-stale",
        type: "oracle.stale",
        severity: "P0",
        title: "Oracle feed stale",
        context: latestMetric
          ? `Last update ${Math.round((now.getTime() - latestMetric.takenAt.getTime()) / 3_600_000)}h ago`
          : "No oracle data on record",
        href: "/admin/monitoring",
        createdAt: latestMetric?.takenAt.toISOString() ?? now.toISOString(),
      });
    }

    // ── P1: Rebalance signal awaiting action (status = "pending") ────────────
    const pendingRebalance = await prisma.rebalanceEvent.findFirst({
      where: { status: "pending" },
      orderBy: { triggeredAt: "desc" },
    });
    if (pendingRebalance) {
      items.push({
        id: `rebalance-${pendingRebalance.id}`,
        type: "rebalance.signal",
        severity: "P1",
        title: "Rebalance signal awaiting action",
        context: pendingRebalance.triggerText ?? "Engine-proposed rebalancing",
        href: "/admin/signals",
        createdAt: pendingRebalance.triggeredAt.toISOString(),
      });
    }

    // ── P1: Attestation overdue (most recent mining proof > 30d old) ─────────
    const stale30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const overdueProof = await prisma.proof.findFirst({
      where: {
        proofType: "mining_attestation",
        postedAt: { lt: stale30d },
      },
      orderBy: { postedAt: "asc" },
    });
    if (overdueProof) {
      items.push({
        id: `attestation-overdue-${overdueProof.id}`,
        type: "attestation.overdue",
        severity: "P1",
        title: "Attestation overdue",
        context: `${overdueProof.proofType} proof last posted ${Math.round((now.getTime() - overdueProof.postedAt.getTime()) / 86_400_000)}d ago`,
        href: "/admin/proofs",
        createdAt: overdueProof.postedAt.toISOString(),
      });
    }
  } catch {
    // DB unavailable — return empty queue (no false P0s)
  }

  // Sort: P0 first, then P1, then P2; within severity by createdAt desc
  const order: Record<ActionSeverity, number> = { P0: 0, P1: 1, P2: 2 };
  return items.sort(
    (a, b) =>
      order[a.severity] - order[b.severity] ||
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

// ---------------------------------------------------------------------------
// Cross-vault hero KPIs
// ---------------------------------------------------------------------------

async function buildHeroKpis(): Promise<HeroKpi[]> {
  try {
    const [vaultRefs, latestSnapshot, latestMetric, latestDistrib] =
      await Promise.all([
        listAllVaults({ status: "live-or-paused" }),
        prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
        prisma.miningMetric.findFirst({ orderBy: { takenAt: "desc" } }),
        prisma.distribution.findFirst({
          orderBy: { distributedAt: "desc" },
        }),
      ]);

    const tvl = latestSnapshot?.aumUsdc?.toNumber() ?? 0;
    const apyLow = latestSnapshot?.currentApyLow?.toNumber() ?? 9.4;
    const apyHigh = latestSnapshot?.currentApyHigh?.toNumber() ?? 12.8;
    const oracleAge = latestMetric
      ? Math.round((Date.now() - latestMetric.takenAt.getTime()) / 60_000)
      : null;
    const isOracleStale = oracleAge === null || oracleAge > 360;

    // P0 count from a quick proxy: oracle stale or margin red
    const p0Count =
      (isOracleStale ? 1 : 0) +
      (latestSnapshot && latestSnapshot.miningMarginScore < 15 ? 1 : 0);

    // Next distribution label (most recent completed distribution period)
    const nextDistLabel = latestDistrib
      ? `${latestDistrib.period ?? "—"}`
      : "—";

    const signerCount = 3; // stub — Fireblocks multisig threshold; Phase 3 wires live signer list

    return [
      {
        label: "TVL",
        value: tvl > 0 ? usdCompact.format(tvl) : "—",
        sublabel: `${vaultRefs.length} vault${vaultRefs.length !== 1 ? "s" : ""}`,
        provenance: latestSnapshot ? "live" : "estimated",
      },
      {
        label: "APY",
        value: tvl > 0 || latestSnapshot ? `${apyLow.toFixed(1)}–${apyHigh.toFixed(1)}%` : "9.4–12.8%",
        sublabel: "forward 12m · not guaranteed",
        provenance: "estimated",
      },
      {
        label: "Next J-3",
        value: nextDistLabel,
        sublabel: "distribution window",
        provenance: latestDistrib ? "live" : "estimated",
      },
      {
        label: "Signers",
        value: `${signerCount}/3`,
        sublabel: "multisig quorum",
        provenance: "manual",
      },
      {
        label: "Oracles",
        value: isOracleStale ? "Stale" : `${oracleAge}m ago`,
        sublabel: isOracleStale ? "feed degraded" : "last update",
        provenance: isOracleStale ? "stale" : "live",
        alert: isOracleStale,
      },
      {
        label: "P0",
        value: String(p0Count),
        sublabel: p0Count > 0 ? "critical actions" : "all clear",
        provenance: "live",
        alert: p0Count > 0,
      },
    ];
  } catch {
    // Return safe stubs so the page never crashes
    return [
      { label: "TVL", value: "—", sublabel: "no snapshot", provenance: "manual" },
      { label: "APY", value: "9.4–12.8%", sublabel: "methodology preset", provenance: "estimated" },
      { label: "Next J-3", value: "—", sublabel: "no distribution", provenance: "estimated" },
      { label: "Signers", value: "3/3", sublabel: "multisig quorum", provenance: "manual" },
      { label: "Oracles", value: "—", sublabel: "no data", provenance: "stale", alert: true },
      { label: "P0", value: "0", sublabel: "all clear", provenance: "live" },
    ];
  }
}

// ---------------------------------------------------------------------------
// Live metrics per vault
// ---------------------------------------------------------------------------

async function buildVaultMetrics(): Promise<VaultLiveMetric[]> {
  try {
    const [vaultRefs, latestSnapshot, latestMetric] = await Promise.all([
      listAllVaults({ status: "live-or-paused" }),
      prisma.vaultSnapshot.findFirst({ orderBy: { takenAt: "desc" } }),
      prisma.miningMetric.findFirst({ orderBy: { takenAt: "desc" } }),
    ]);

    const oracleDelayMs = latestMetric
      ? Date.now() - latestMetric.takenAt.getTime()
      : null;

    return vaultRefs.map((ref) => {
      const name =
        ref.kind === "fixture"
          ? ref.fixture.label
          : vaultLabel(ref);
      const isYield =
        ref.kind === "fixture"
          ? ref.fixture.id === "yield"
          : false;

      return {
        vaultId:
          ref.kind === "fixture" ? ref.fixture.id : ref.deployment.id,
        vaultName: name,
        tvlUsdc: isYield ? (latestSnapshot?.aumUsdc?.toNumber() ?? 0) : 0,
        miningMarginScore: latestSnapshot?.miningMarginScore ?? 0,
        riskScore: latestSnapshot?.riskScore ?? 0,
        oracleDelayMs,
        btcPosture: latestSnapshot?.mode ?? "neutral",
        status: ref.kind === "fixture" ? "live" : ref.deployment.status,
      };
    });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// On-chain events from RebalanceEvent + Distribution (last 5)
// ---------------------------------------------------------------------------

async function buildOnChainEvents(): Promise<OnChainEvent[]> {
  try {
    const [rebalances, distributions] = await Promise.all([
      prisma.rebalanceEvent.findMany({
        orderBy: { triggeredAt: "desc" },
        take: 3,
        select: { id: true, triggeredAt: true, status: true, triggerText: true },
      }),
      prisma.distribution.findMany({
        orderBy: { distributedAt: "desc" },
        take: 2,
        select: { id: true, distributedAt: true, period: true },
      }),
    ]);

    const events: OnChainEvent[] = [
      ...rebalances.map((r) => ({
        id: r.id,
        type: "swap" as const,
        label: `Rebalance · ${r.triggerText ?? r.status}`,
        occurredAt: r.triggeredAt.toISOString(),
      })),
      ...distributions.map((d) => ({
        id: d.id,
        type: "deposit" as const,
        label: `Distribution ${d.period ?? d.id.slice(0, 8)}`,
        occurredAt: d.distributedAt.toISOString(),
      })),
    ];

    return events
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Audit trail — last 20 AdminAudit rows
// ---------------------------------------------------------------------------

async function buildAuditTrail(): Promise<AuditTrailEntry[]> {
  try {
    const rows = await prisma.adminAudit.findMany({
      orderBy: { occurredAt: "desc" },
      take: 20,
      select: {
        id: true,
        occurredAt: true,
        actorWallet: true,
        action: true,
        entityType: true,
        entityId: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt.toISOString(),
      actorWallet: r.actorWallet,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main entry — load everything in parallel
// ---------------------------------------------------------------------------

export async function loadCockpitPayload(): Promise<CockpitPayload> {
  const [heroKpis, actionQueue, vaultMetrics, inngestJobs, sentryStats, onChainEvents, auditTrail] =
    await Promise.all([
      buildHeroKpis(),
      buildActionQueue(),
      buildVaultMetrics(),
      inferInngestJobs(),
      inferSentryStats(),
      buildOnChainEvents(),
      buildAuditTrail(),
    ]);

  return {
    heroKpis,
    actionQueue,
    vaultMetrics,
    inngestJobs,
    sentryStats,
    onChainEvents,
    auditTrail,
  };
}
