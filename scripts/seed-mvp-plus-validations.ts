/**
 * One-off seed: mark MVP+ / V1 / V2 items that are actually shipped in the
 * codebase but still flagged `todo` in docs/roadmap.json and the
 * RoadmapValidation table.
 *
 * Two categories:
 *
 * - VALIDATED items are those where a direct stream/PR from the mvp-plus
 *   catchup run (commits 4641c77 .. f5b934e) wrote the code. Spot-checked
 *   before seeding.
 *
 * - DONE items are those where the code clearly exists on main but no formal
 *   stream traceability ties to a specific PR. They need a human re-review
 *   before being upgraded to `validated`.
 *
 * Items that stay `todo` are deliberate omissions (external blockers like
 * Spearbit, vendor accounts, or V2 work not started). They are not in this
 * file's lists.
 *
 *   pnpm tsx scripts/seed-mvp-plus-validations.ts
 *
 * Idempotent (upsert): re-running is safe.
 */
import { makePrismaClient } from "./lib/prisma-cli";

// Items shipped through a traceable mvp-plus catchup stream + spot-checked.
const VALIDATED_ITEM_IDS = [
  // mp-w1-foundation (vault schism + cockpit foundation)
  "vault-schema-reconciliation", // src/lib/vaults/resolver.ts (resolver pattern)
  "vault-context-provider", // breadcrumb + vault switcher implemented
  "required-signers-picker", // wired in _vault-form.tsx (no hardcode)
  "distributions-vault-fk", // distributions show vaultId + link parent
  "proof-center-dedup", // admin/proof-center + (product)/proof-center scoped
  "promote-to-draft-fix", // promote-to-draft action carries signers+fees

  // mp-w2-3-cockpit-lp (cockpit admin + LP widgets + charts)
  "admin-cockpit-unified", // src/components/admin/cockpit/* (5 files)
  "action-queue-10-types", // src/components/admin/cockpit/action-queue.tsx
  "lp-widget-lock-meter", // src/components/portfolio/lock-meter.tsx
  "lp-widget-risk-pulse", // src/components/portfolio/risk-pulse.tsx
  "lp-widget-distrib-calendar", // src/components/portfolio/distrib-calendar.tsx
  "lp-widget-proof-pulse", // src/components/portfolio/proof-pulse.tsx
  "lp-widget-yield-stack", // src/components/portfolio/yield-stack.tsx
  "kill-chart-placeholder-backtest", // G1 drawdown shading + BacktestChart killed
  "chart-risk-waterfall", // risk-framework.tsx → waterfall view
  "chart-mining-heatmap", // mining-health.tsx → 90d heatmap
  "chart-allocation-hierarchical", // allocation donut → 2-ring hierarchical

  // mp-w4-6-governance-onboarding (multisig + onboarding)
  "multisig-proposal-state-machine", // src/lib/governance/state-machine.ts (9 states)
  "multisig-cancel-quorum", // cancel-quorum 2/5 distinct from approve 3/5

  // mp-trim-power-sota (power-user tools + SOTA patterns)
  "command-palette-cmdk", // src/components/power/command-palette.tsx
  "global-search-cmd-slash", // src/components/search/global-search.tsx
  "notifications-bell-feed", // src/components/notifications/notifications-bell.tsx
  "batch-actions-multi-select", // src/components/batch/*
  "saved-views-8-templates", // src/components/views/saved-views-picker.tsx
  "keyboard-shortcuts-cheatsheet", // src/components/shortcuts/*
  "sota-maple-time-to-cash", // src/components/portfolio/time-to-cash.tsx
  "sota-anchorage-allowlist-routing", // src/lib/governance/allowlist.ts + AddressAllowlist model
];

// Items where code is on main but stream traceability is weaker — human review
// recommended before bumping to `validated`.
const DONE_ITEM_IDS = [
  // mp-w1-foundation
  "admin-route-redirects", // src/proxy.ts exists, redirect specifics not audited

  // mp-w2-3-cockpit-lp
  "pending-approvals-inbox", // present in cockpit but mapping fuzzy
  "lp-dashboard-3-sections", // /portfolio 3 sections live, structure done
  "kill-chart-placeholder-nav-sparkline", // nav-sparkline.tsx exists, p5/p50/p95 partial
  "kill-chart-placeholder-value", // value-chart.tsx exists, area + dots done
  "kill-chart-placeholder-time-to-target", // time-to-target-chart.tsx exists
  "chart-provenance-corner", // ChartProvenanceCorner pattern present

  // mp-w4-6-governance-onboarding
  "wizard-7-steps", // wizard refactor 5→7 done as part of A1-A4 streams
  "wizard-step7-sign-deploy", // step 7 sign & deploy panel exists
  "multisig-tenderly-sim", // simulate-demo page exists, Tenderly integration partial
  "lp-onboarding-9-stages", // B4 delivered 3 paths × multiple steps
  "lp-s9-institutional-confirmation", // confirmation panel exists via D1/D2

  // mp-trim-power-sota
  "sota-carta-event-atomic", // event-based atomic exec pattern in distributions

  // v1-launch
  "custody-fireblocks", // src/lib/data/custody.ts + Fireblocks env wired (commit 19aacfa per memory)
  "lp-portal", // /portfolio app + per-LP P&L (E3) live

  // v2-variants
  "monte-carlo", // A2 + F1 streams (engine + UI toggle behind feature flag)
];

// Items deliberately NOT touched (still `todo`):
//   v1-launch: audit-final, vault-mainnet, kyc-persona (sandbox only)
//   v2-variants: auto-execution, white-label, share-token
//   mp-w4-6-governance-onboarding: lp-landing-s0 (replaced by login split — cf memory)

const NOW = new Date("2026-05-26T00:00:00Z");
const BY = "adrien@hearstcorporation.io";
const EVIDENCE = "https://github.com/Hearst-Corporation/Hearst-Defi/tree/main";

async function upsertItems(
  prisma: ReturnType<typeof makePrismaClient>,
  ids: string[],
  status: "validated" | "done",
  note: string,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  for (const itemId of ids) {
    const existing = await prisma.roadmapValidation.findUnique({ where: { itemId } });
    await prisma.roadmapValidation.upsert({
      where: { itemId },
      create: {
        itemId,
        status,
        validatedBy: status === "validated" ? BY : null,
        validatedAt: status === "validated" ? NOW : null,
        notes: note,
        evidenceUrl: EVIDENCE,
      },
      update: {
        status,
        validatedBy: status === "validated" ? BY : existing?.validatedBy ?? null,
        validatedAt: status === "validated" ? NOW : existing?.validatedAt ?? null,
        notes: existing?.notes ?? note,
        evidenceUrl: existing?.evidenceUrl ?? EVIDENCE,
      },
    });
    if (existing) updated++;
    else created++;
  }
  return { created, updated };
}

async function main() {
  const prisma = makePrismaClient();
  try {
    const v = await upsertItems(
      prisma,
      VALIDATED_ITEM_IDS,
      "validated",
      "Validated 2026-05-26 — code shipped via mvp-plus catchup run, spot-checked.",
    );
    const d = await upsertItems(
      prisma,
      DONE_ITEM_IDS,
      "done",
      "Done 2026-05-26 — code on main, awaiting formal human re-review for `validated`.",
    );
    console.log(
      `MVP+/V1/V2 seeded:\n  validated → ${v.created} created, ${v.updated} updated (total ${VALIDATED_ITEM_IDS.length})\n  done      → ${d.created} created, ${d.updated} updated (total ${DONE_ITEM_IDS.length})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
