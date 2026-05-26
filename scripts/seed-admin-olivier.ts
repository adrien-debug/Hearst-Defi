/**
 * One-off seed: create / upgrade `olivier@hearstcorporation.io` as admin.
 *
 *   pnpm tsx scripts/seed-admin-olivier.ts
 *
 * Idempotent: re-running it leaves the row in the same final state (role=admin,
 * password reset to ADMIN_INITIAL_PASSWORD). Mirrors the seed pattern used by
 * prisma/seed.ts for `pierre@hearstcorporation.io`.
 */
import { hash } from "@node-rs/argon2";

import { makePrismaClient } from "./lib/prisma-cli";

// Must match src/lib/auth/password.ts ARGON2_OPTIONS exactly so the runtime
// verifyPassword() succeeds on the very first login.
const ALGORITHM_ARGON2ID = 2;
const ARGON2_OPTIONS = {
  algorithm: ALGORITHM_ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

const EMAIL = "olivier@hearstcorporation.io";
const INITIAL_PASSWORD =
  process.env.ADMIN_INITIAL_PASSWORD?.trim() || "Hearst1234$$";

async function main() {
  const prisma = makePrismaClient();
  try {
    const passwordHash = await hash(INITIAL_PASSWORD, ARGON2_OPTIONS);

    const before = await prisma.user.findUnique({
      where: { email: EMAIL },
      select: { id: true, role: true },
    });

    const user = await prisma.user.upsert({
      where: { email: EMAIL },
      create: {
        email: EMAIL,
        passwordHash,
        role: "admin",
      },
      update: {
        passwordHash,
        role: "admin",
      },
    });

    if (before === null) {
      console.log(
        `Created admin user ${user.email} (id=${user.id}, role=${user.role}).`,
      );
    } else if (before.role !== "admin") {
      console.log(
        `Upgraded ${user.email} from role=${before.role} to role=${user.role}; password reset.`,
      );
    } else {
      console.log(
        `Refreshed admin ${user.email} (id=${user.id}); password reset to ADMIN_INITIAL_PASSWORD.`,
      );
    }
    console.log("\nLogin credentials (give to Olivier — private):");
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${INITIAL_PASSWORD}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
