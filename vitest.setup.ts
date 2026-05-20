/**
 * Vitest setup — runs once before all test files.
 *
 * Ensures critical environment variables are present so that
 * `src/lib/env.ts` validates cleanly in test mode.
 *
 * DATABASE_URL note — Prisma 5+ resolves SQLite paths relative to the
 * schema file (`prisma/schema.prisma`), so `file:./dev.db` actually points
 * at `prisma/dev.db` on disk. Previously this was `file:./prisma/dev.db`
 * which double-resolved to `prisma/prisma/dev.db` — the source of the
 * orphan DB cleaned up in this same change.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";
