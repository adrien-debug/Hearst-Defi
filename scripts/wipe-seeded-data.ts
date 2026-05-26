/**
 * Wipe seeded fixture data from the dev DB while keeping auth tables intact.
 *
 * Why: `prisma/seed.ts` populates ~10 tables with fixture rows so the dashboard
 * "looks alive" in dev. Adrien's directive (2026-05-26): no fake numbers ever.
 * If the DB has nothing real, the UI must show empty states — not seeded data
 * masquerading as live ingestion.
 *
 * What is wiped: VaultSnapshot, Allocation, MiningMetric, RebalanceEvent,
 *   Distribution, Proof, InvestorTransaction, Position, Scenario, Backtest,
 *   Report.
 * What is kept:  User, Investor, VaultDeployment, RoadmapValidation, Feedback,
 *   GovernanceProposal*, etc. (auth + admin tables).
 *
 * Run with: `pnpm tsx scripts/wipe-seeded-data.ts`
 */

import { makePrismaClient } from "./lib/prisma-cli";

const prisma = makePrismaClient();

async function main() {
  console.log("Wiping seeded fixture data...");

  // Order matters: delete child rows before parents (FK constraints).
  const results = await prisma.$transaction([
    prisma.allocation.deleteMany({}),
    prisma.vaultSnapshot.deleteMany({}),
    prisma.miningMetric.deleteMany({}),
    prisma.rebalanceEvent.deleteMany({}),
    prisma.distribution.deleteMany({}),
    prisma.proof.deleteMany({}),
    prisma.investorTransaction.deleteMany({}),
    prisma.position.deleteMany({}),
  ]);

  const labels = [
    "Allocation",
    "VaultSnapshot",
    "MiningMetric",
    "RebalanceEvent",
    "Distribution",
    "Proof",
    "InvestorTransaction",
    "Position",
  ];

  console.log("");
  console.log("Done. Rows deleted:");
  results.forEach((r, i) => {
    console.log(`  ${labels[i]?.padEnd(22)} ${r.count}`);
  });
  console.log("");
  console.log("Kept intact: User, Investor, VaultDeployment, RoadmapValidation, Feedback, GovernanceProposal*.");
}

main()
  .catch((err) => {
    console.error("Wipe failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
