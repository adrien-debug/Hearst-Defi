/**
 * Mark `lp-landing-s0` as cancelled in RoadmapValidation.
 *
 * Reason: replaced by login split-screen at `/`. Marketing content lives on
 * the corporate site (hearst.app), not on connect.hearst.app. Decision made
 * 2026-05-26 by Adrien.
 *
 * Idempotent.
 */
import { makePrismaClient } from "./lib/prisma-cli";

async function main() {
  const prisma = makePrismaClient();
  try {
    await prisma.roadmapValidation.upsert({
      where: { itemId: "lp-landing-s0" },
      create: {
        itemId: "lp-landing-s0",
        status: "cancelled",
        validatedBy: "adrien@hearstcorporation.io",
        validatedAt: new Date("2026-05-26T00:00:00Z"),
        notes:
          "Cancelled 2026-05-26. Replaced by login split-screen at /. Marketing content moved to hearst.app.",
      },
      update: {
        status: "cancelled",
        validatedBy: "adrien@hearstcorporation.io",
        validatedAt: new Date("2026-05-26T00:00:00Z"),
        notes:
          "Cancelled 2026-05-26. Replaced by login split-screen at /. Marketing content moved to hearst.app.",
      },
    });
    console.log("lp-landing-s0 → cancelled in DB");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
