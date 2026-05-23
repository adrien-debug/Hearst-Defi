/**
 * Vitest setup — runs once before all test files.
 *
 * Ensures critical environment variables are present so that
 * `src/lib/env.ts` validates cleanly in test mode.
 *
 * DATABASE_URL note — Prisma 7 routes the runtime through a driver adapter
 * (`@prisma/adapter-better-sqlite3`) which resolves SQLite paths relative
 * to the process CWD (NOT the schema file, as Prisma 5/6 did). Vitest runs
 * from the project root, so we point explicitly at `prisma/dev.db` to land
 * on the seeded fixture DB instead of creating an empty `./dev.db` orphan.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
