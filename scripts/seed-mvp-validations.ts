/**
 * One-off seed: mark the 48 MVP items as `validated` in RoadmapValidation.
 *
 * The MVP shipped well before this run — but RoadmapValidation rows were never
 * written, so `/admin/roadmap` displays 0/48 even though the code is live. This
 * script back-fills the validation state in bulk after a manual code-spot-check.
 *
 *   pnpm tsx scripts/seed-mvp-validations.ts
 *
 * Idempotent (upsert): re-running it is safe.
 */
import { makePrismaClient } from "./lib/prisma-cli";

const MVP_ITEM_IDS = [
  "repo-init",
  "ui-atoms",
  "claude-config",
  "docs-spec",
  "prisma-schema",
  "admin-roadmap",
  "admin-spec",
  "admin-feedback",
  "auth-privy",
  "ingest-btc-price",
  "ingest-hashprice",
  "sentry-setup",
  "dash-layout",
  "dash-hero",
  "dash-allocation",
  "dash-mining-health",
  "dash-btc-tactical",
  "dash-activity",
  "dash-advanced-toggle",
  "engine-types",
  "engine-mining",
  "engine-btc-tactical",
  "engine-rebalancing",
  "engine-scenario",
  "engine-tests",
  "lab-layout",
  "lab-presets",
  "lab-sliders",
  "ptai-component",
  "agent-scenario-narrative",
  "agent-schemas",
  "lab-comparator",
  "proof-center-layout",
  "data-backfill",
  "engine-backtest",
  "mock-attestation",
  "agent-mining-health",
  "agent-risk-explanation",
  "agent-investor-memo",
  "memo-pdf-template",
  "memo-screen",
  "methodology-v10",
  "sc-event-logger",
  "sc-por-registry",
  "proof-center-wire",
  "polish-ux",
  "sales-playbook",
  "audit-kickoff",
];

const VALIDATED_AT = new Date("2026-05-26T00:00:00Z");
const VALIDATED_BY = "adrien@hearstcorporation.io";
const EVIDENCE_URL = "https://github.com/Hearst-Corporation/Hearst-Defi/tree/main";
const NOTES =
  "Validated en bloc on 2026-05-26 after MVP+ catchup run (post commit f5b934e). MVP delivered as of snapshot 2026-05-26.";

async function main() {
  const prisma = makePrismaClient();
  let created = 0;
  let updated = 0;
  try {
    for (const itemId of MVP_ITEM_IDS) {
      const existing = await prisma.roadmapValidation.findUnique({ where: { itemId } });
      await prisma.roadmapValidation.upsert({
        where: { itemId },
        create: {
          itemId,
          status: "validated",
          validatedBy: VALIDATED_BY,
          validatedAt: VALIDATED_AT,
          notes: NOTES,
          evidenceUrl: EVIDENCE_URL,
        },
        update: {
          status: "validated",
          validatedBy: VALIDATED_BY,
          validatedAt: VALIDATED_AT,
          notes: existing?.notes ?? NOTES,
          evidenceUrl: existing?.evidenceUrl ?? EVIDENCE_URL,
        },
      });
      if (existing) updated++;
      else created++;
    }
    console.log(
      `MVP validations seeded: ${created} created, ${updated} updated (total ${MVP_ITEM_IDS.length})`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
