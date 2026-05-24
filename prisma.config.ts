/**
 * Prisma 7 CLI configuration.
 *
 * The Prisma CLI (`prisma generate / db push / migrate / studio`) no longer
 * reads `datasource.url` from the schema. We supply it here so the CLI can
 * still drive migrations via the classic schema engine, while the runtime
 * `PrismaClient` (src/lib/db.ts) uses a driver adapter — both env-driven
 * (`PRISMA_PROVIDER` + `DATABASE_URL`) and kept in lockstep.
 *
 *   PRISMA_PROVIDER=sqlite     DATABASE_URL=file:./prisma/dev.db   pnpm db:push
 *   PRISMA_PROVIDER=postgresql DATABASE_URL=postgresql://...        pnpm db:push
 */
import { defineConfig } from "prisma/config";

const rawUrl = process.env.DATABASE_URL?.trim() ?? "";
const FALLBACK_DEV_URL = "file:./prisma/dev.db";

if (
  process.env.NODE_ENV === "production" &&
  (!rawUrl || rawUrl === FALLBACK_DEV_URL)
) {
  throw new Error(
    "DATABASE_URL must point to a production database when NODE_ENV=production. " +
      `Refusing to fall back to "${FALLBACK_DEV_URL}".`,
  );
}

const databaseUrl = rawUrl || FALLBACK_DEV_URL;

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
