/**
 * Vitest setup — runs once before all test files.
 *
 * Ensures critical environment variables are present so that
 * `src/lib/env.ts` validates cleanly in test mode.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
