/**
 * Minimal prod-safe admin bootstrap — upserts admin users only.
 * Does NOT call resetTables(). Safe to run against production.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "@node-rs/argon2";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ARGON2_OPTIONS = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

async function main() {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const password = process.env.ADMIN_INITIAL_PASSWORD ?? "";
  const emails = raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

  if (emails.length === 0 || password.length === 0) {
    console.log("ADMIN_EMAILS or ADMIN_INITIAL_PASSWORD not set — nothing to do.");
    return;
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);
  for (const email of emails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "admin", passwordHash },
      create: { email, role: "admin", passwordHash },
    });
    console.log(`✓ Admin upserted: ${email}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
