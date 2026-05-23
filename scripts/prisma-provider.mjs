/**
 * scripts/prisma-provider.mjs
 *
 * WHY THIS EXISTS:
 * Prisma 6 does NOT support env() inside the `datasource.provider` field
 * (only `url` supports env interpolation). This means we cannot switch the
 * provider between sqlite (local dev) and postgresql (CI / Vercel prod) via a
 * plain env var in schema.prisma.
 *
 * This script runs BEFORE `prisma generate` in the build pipeline. It reads
 * PRISMA_PROVIDER and rewrites ONLY the `provider = "..."` line inside the
 * `datasource db { ... }` block — leaving everything else (generator block,
 * binaryTargets, models) completely untouched.
 *
 * USAGE:
 *   node scripts/prisma-provider.mjs               # PRISMA_PROVIDER absent → no-op
 *   PRISMA_PROVIDER=postgresql node …              # flips datasource provider to postgresql
 *   PRISMA_PROVIDER=sqlite     node …              # flips datasource provider to sqlite
 *
 * EXIT: always 0 (non-IO errors aside).
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../prisma/schema.prisma");

const ALLOWED = new Set(["sqlite", "postgresql"]);

// Trim defensively — `vercel env add` via `echo "x"` stores a trailing newline,
// which would fail the strict membership check below.
const target = process.env.PRISMA_PROVIDER?.trim();

if (!target) {
  console.log("[prisma-provider] PRISMA_PROVIDER not set — keeping current provider (no-op)");
  process.exit(0);
}

if (!ALLOWED.has(target)) {
  console.error(
    `[prisma-provider] ERROR: PRISMA_PROVIDER="${target}" is not a recognised value. ` +
      `Accepted values: ${[...ALLOWED].join(", ")}.`
  );
  process.exit(1);
}

let schema;
try {
  schema = readFileSync(SCHEMA_PATH, "utf8");
} catch (err) {
  console.error(`[prisma-provider] ERROR: cannot read ${SCHEMA_PATH}: ${err.message}`);
  process.exit(1);
}

// Detect current provider inside the datasource block only.
// Pattern matches:  provider = "sqlite"  or  provider = "postgresql"
// anchored to the datasource block by requiring it to follow `datasource db {`
// via a stateful scan — but since the schema has exactly one datasource, a
// targeted regex on the datasource section is sufficient and avoids false
// positives on generator.provider or model fields.
const DATASOURCE_RE = /(datasource\s+\w+\s*\{[^}]*?\n\s*provider\s*=\s*")(\w+)(")/s;

const match = DATASOURCE_RE.exec(schema);
if (!match) {
  console.error(
    "[prisma-provider] ERROR: could not locate `provider = \"...\"` inside a datasource block. " +
      "Schema format may have changed."
  );
  process.exit(1);
}

const current = match[2];

if (current === target) {
  console.log(`[prisma-provider] provider is already "${target}" — no-op`);
  process.exit(0);
}

const updated = schema.replace(DATASOURCE_RE, `$1${target}$3`);

try {
  writeFileSync(SCHEMA_PATH, updated, "utf8");
} catch (err) {
  console.error(`[prisma-provider] ERROR: cannot write ${SCHEMA_PATH}: ${err.message}`);
  process.exit(1);
}

console.log(`[prisma-provider] switched provider from "${current}" to "${target}"`);
