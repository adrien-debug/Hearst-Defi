import { makePrismaClient } from "../scripts/lib/prisma-cli";

import {
  buildMiningMetricRows,
  dayKeyOf,
  selectNewRows,
} from "../src/lib/data/backfill";
import { buildMarketHistory } from "../src/lib/data/history";

// One-off historical backfill of the MiningMetric timeseries (default 36 months).
// Idempotent: days already present in the DB are skipped, so it is safe to re-run
// and it composes with the 30 daily rows the seed creates.
//
//   pnpm db:backfill            # 36 months
//   pnpm db:backfill 12         # 12 months

const prisma = makePrismaClient();
const SQLITE_CHUNK = 80; // keep bound params per INSERT well under SQLite's 999

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[backfill] ABORT: refuses to run with NODE_ENV=production. Use a dev/test DB.",
    );
    process.exit(1);
  }

  const months = Math.max(1, Math.trunc(Number(process.argv[2] ?? 36)) || 36);
  console.log(`[backfill] building ${months} months of daily market history…`);

  const history = await buildMarketHistory({ months });
  const rows = buildMiningMetricRows(history.points);

  const existing = await prisma.miningMetric.findMany({
    select: { takenAt: true },
  });
  const existingDays = new Set(existing.map((e) => dayKeyOf(e.takenAt)));
  const toInsert = selectNewRows(rows, existingDays);

  for (let i = 0; i < toInsert.length; i += SQLITE_CHUNK) {
    await prisma.miningMetric.createMany({
      data: toInsert.slice(i, i + SQLITE_CHUNK),
    });
  }

  const first = rows[0];
  const last = rows[rows.length - 1];
  console.log("[backfill] done:");
  console.log(
    `  range:       ${first ? dayKeyOf(first.takenAt) : "—"} → ${last ? dayKeyOf(last.takenAt) : "—"}`,
  );
  console.log(`  btc source:  ${history.btcSource}`);
  console.log(`  diff source: ${history.difficultySource}`);
  console.log(`  total days:  ${rows.length}`);
  console.log(`  inserted:    ${toInsert.length}`);
  console.log(`  skipped:     ${rows.length - toInsert.length} (already present)`);
}

main()
  .catch((err: unknown) => {
    console.error("[backfill] failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
