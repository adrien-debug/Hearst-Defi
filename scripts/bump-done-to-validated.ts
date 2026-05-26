/**
 * Bump every RoadmapValidation row currently in status "done" to "validated".
 *
 * Used 2026-05-26 after Adrien confirmed the 34 items still in `done` were
 * inspected and approved. Idempotent: re-running it is a no-op once everything
 * is already `validated`.
 *
 *   pnpm tsx scripts/bump-done-to-validated.ts
 */
import { makePrismaClient } from "./lib/prisma-cli";

const NOW = new Date("2026-05-26T00:00:00Z");
const BY = "adrien@hearstcorporation.io";
const NOTE = "Bumped done → validated 2026-05-26 after Adrien manual approval pass.";

async function main() {
  const prisma = makePrismaClient();
  try {
    const result = await prisma.roadmapValidation.updateMany({
      where: { status: "done" },
      data: {
        status: "validated",
        validatedBy: BY,
        validatedAt: NOW,
      },
    });
    const total = await prisma.roadmapValidation.count({ where: { status: "validated" } });
    console.log(`Bumped ${result.count} rows done → validated. Total validated now: ${total}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
