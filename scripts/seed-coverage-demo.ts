/**
 * Seed an HONEST "Estimated" coverage demo (P1.5) — dev/staging only.
 *
 * Inserts clearly-marked demo MiningMetric + Distribution rows so the
 * distribution-coverage engine resolves to ESTIMATED (never Live: no attestation
 * is created). Run:  pnpm tsx scripts/seed-coverage-demo.ts
 *
 * Guard: refuses to run in production unless ALLOW_DEMO_COVERAGE_SEED=true.
 * For the coverage to show Estimated (not Pending), also set
 * MINING_REVENUE_SHARE_BPS (e.g. 4000) in .env.local — revenue-share is a manual
 * input. This script NEVER fabricates a Live/attested figure.
 */

import { makePrismaClient } from "./lib/prisma-cli";
import {
  canSeedCoverageDemo,
  buildDemoMiningMetric,
  buildDemoDistribution,
  periodOf,
  DEMO_MARKER,
} from "../src/lib/dev/coverage-demo";

async function main() {
  if (!canSeedCoverageDemo()) {
    console.log(
      "Refusing to seed demo coverage in production. Set ALLOW_DEMO_COVERAGE_SEED=true to override. Aborting (no writes).",
    );
    process.exit(0);
  }

  const prisma = makePrismaClient();
  const now = new Date();
  const period = periodOf(now);
  const vaultRef = process.argv[2] ?? "hearst-yield-vault";

  try {
    const metric = await prisma.miningMetric.create({
      data: buildDemoMiningMetric(),
    });
    const distribution = await prisma.distribution.create({
      data: buildDemoDistribution(now, period, vaultRef),
    });

    console.log(`✓ Demo MiningMetric inserted (${metric.id}) — ${DEMO_MARKER}`);
    console.log(
      `✓ Demo Distribution target inserted (${distribution.id}) — period ${period}, vault ${vaultRef}, $800,000`,
    );
    if (process.env.MINING_REVENUE_SHARE_BPS === undefined) {
      console.log(
        "\nNOTE: set MINING_REVENUE_SHARE_BPS (e.g. 4000) in .env.local — without it coverage stays Pending (revenue-share is required). With it, coverage = Estimated (never Live: no attestation seeded).",
      );
    } else {
      console.log(
        "\nCoverage will now resolve to ESTIMATED for the current period (manual revenue-share, no attestation).",
      );
    }
  } catch (e) {
    console.error("Demo seed failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
