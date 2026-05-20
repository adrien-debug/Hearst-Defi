-- Migration: cleanup_proofs_rebalance_schema
--
-- Three concerns in one atomic migration:
--   (1) BacktestRun data hygiene — backfill rows that pre-date the
--       userId / createdAt / updatedAt requirement (V1.d sub-agent had to
--       work around this via raw ALTER TABLE on a stale db push DB; here
--       we make the next migrate dev cycle safe by default).
--   (2) Proof.notes — V3.i (admin proofs Server Action) already validates
--       this field via Zod (≤ 500 chars). Without the column the value
--       was silently dropped on persist. We add it as nullable to keep
--       legacy rows valid.
--   (3) RebalanceEvent enrichment — V3.j (rebalancing-signal Inngest)
--       had to embed projection into triggerText and use approvedBy="[]"
--       as a proxy for status="pending". We add the proper fields:
--         status           "pending" | "approved" | "executed" | "cancelled"
--         projection       PTAI Projection (moved out of triggerText)
--         triggeredAt      separate from executedAt
--         sourceEventName  Inngest event name for traceability
--         sourceEventId    Inngest event id for traceability
--       Default values keep historical rows (executedAt-only) valid.

-- (1) BacktestRun cleanup — idempotent guardrails for any pre-existing
--     rows that may carry NULL on the now-required columns.
--     UPDATE first (preserves real data, sentinel userId='legacy',
--     created/updatedAt backfilled from ranAt). DELETE is a defensive
--     no-op on a fresh DB; it only triggers if the UPDATE somehow could
--     not satisfy a constraint.
UPDATE "BacktestRun"
SET    "userId"    = COALESCE("userId",    'legacy'),
       "createdAt" = COALESCE("createdAt", "ranAt"),
       "updatedAt" = COALESCE("updatedAt", "ranAt")
WHERE  "userId"    IS NULL
   OR  "createdAt" IS NULL
   OR  "updatedAt" IS NULL;

DELETE FROM "BacktestRun"
WHERE  "userId"    IS NULL
   OR  "createdAt" IS NULL
   OR  "updatedAt" IS NULL;

-- (2) Proof.notes — free-form admin annotation (Zod-validated ≤ 500 chars
--     at the Server Action layer). Nullable so legacy rows stay valid.
-- AlterTable
ALTER TABLE "Proof" ADD COLUMN "notes" TEXT;

-- (3) RebalanceEvent — add status / projection / triggeredAt /
--     sourceEventName / sourceEventId. SQLite cannot add a NOT NULL column
--     with a non-constant default on an existing table, so Prisma uses the
--     "shadow table + copy" pattern below. Historical rows inherit
--     triggeredAt = executedAt (best-effort, matches the prior single-
--     timestamp model).
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RebalanceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,
    "triggerText" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "impactText" TEXT NOT NULL,
    "projection" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceEventName" TEXT,
    "sourceEventId" TEXT,
    "fromAllocation" TEXT NOT NULL,
    "toAllocation" TEXT NOT NULL,
    "txHash" TEXT,
    "approvedBy" TEXT NOT NULL
);
INSERT INTO "new_RebalanceEvent" ("actionText", "approvedBy", "executedAt", "fromAllocation", "id", "impactText", "ruleId", "toAllocation", "triggerText", "txHash", "triggeredAt") SELECT "actionText", "approvedBy", "executedAt", "fromAllocation", "id", "impactText", "ruleId", "toAllocation", "triggerText", "txHash", "executedAt" FROM "RebalanceEvent";
DROP TABLE "RebalanceEvent";
ALTER TABLE "new_RebalanceEvent" RENAME TO "RebalanceEvent";
CREATE INDEX "RebalanceEvent_executedAt_idx" ON "RebalanceEvent"("executedAt");
CREATE INDEX "RebalanceEvent_status_triggeredAt_idx" ON "RebalanceEvent"("status", "triggeredAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
