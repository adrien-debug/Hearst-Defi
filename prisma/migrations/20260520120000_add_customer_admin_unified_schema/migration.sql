-- Migration: add_customer_admin_unified_schema
--
-- Adds 7 new models:
--   Customer side : Investor, Position, InvestorTransaction
--   Admin side    : VaultDeployment, VaultDeploymentApproval,
--                   ProjectionStudyRun, AdminAudit
--
-- All statements use CREATE TABLE IF NOT EXISTS so the migration is
-- idempotent on SQLite (safe to re-apply on a fresh DB or after a partial run).
-- Indexes are guarded by CREATE INDEX IF NOT EXISTS.

-- -----------------------------------------------------------------------------
-- CUSTOMER
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "Investor" (
    "id"            TEXT    NOT NULL PRIMARY KEY,
    "userId"        TEXT    NOT NULL,
    "walletAddress" TEXT    NOT NULL,
    "email"         TEXT,
    "kycStatus"     TEXT    NOT NULL DEFAULT 'pending',
    "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "Investor_userId_key"        ON "Investor"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Investor_walletAddress_key" ON "Investor"("walletAddress");
CREATE INDEX        IF NOT EXISTS "Investor_walletAddress_idx" ON "Investor"("walletAddress");

CREATE TABLE IF NOT EXISTS "Position" (
    "id"                TEXT     NOT NULL PRIMARY KEY,
    "investorId"        TEXT     NOT NULL,
    "vaultDeploymentId" TEXT,
    "vaultKey"          TEXT     NOT NULL DEFAULT 'hearst_yield_vault',
    "principalUsdc"     DECIMAL  NOT NULL,
    "accruedYieldUsdc"  DECIMAL  NOT NULL DEFAULT 0,
    "distributedUsdc"   DECIMAL  NOT NULL DEFAULT 0,
    "status"            TEXT     NOT NULL DEFAULT 'active',
    "subscribedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturedAt"         DATETIME,
    "exitedAt"          DATETIME,
    "txHashOpen"        TEXT,
    CONSTRAINT "Position_investorId_fkey"        FOREIGN KEY ("investorId")        REFERENCES "Investor"("id")        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Position_vaultDeploymentId_fkey" FOREIGN KEY ("vaultDeploymentId") REFERENCES "VaultDeployment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Position_investorId_status_idx"    ON "Position"("investorId", "status");
CREATE INDEX IF NOT EXISTS "Position_vaultDeploymentId_idx"    ON "Position"("vaultDeploymentId");

CREATE TABLE IF NOT EXISTS "InvestorTransaction" (
    "id"         TEXT     NOT NULL PRIMARY KEY,
    "investorId" TEXT     NOT NULL,
    "positionId" TEXT,
    "type"       TEXT     NOT NULL,
    "amountUsdc" DECIMAL  NOT NULL,
    "txHash"     TEXT,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvestorTransaction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InvestorTransaction_investorId_occurredAt_idx" ON "InvestorTransaction"("investorId", "occurredAt");

-- -----------------------------------------------------------------------------
-- ADMIN
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "VaultDeployment" (
    "id"                     TEXT     NOT NULL PRIMARY KEY,
    "ticker"                 TEXT     NOT NULL,
    "name"                   TEXT     NOT NULL,
    "description"            TEXT,
    "strategy"               TEXT     NOT NULL,
    "colorTag"               TEXT     NOT NULL DEFAULT 'accent',
    "status"                 TEXT     NOT NULL DEFAULT 'draft',
    "minTicketUsdc"          DECIMAL  NOT NULL,
    "capacityUsdc"           DECIMAL  NOT NULL,
    "mgmtFeeBps"             INTEGER  NOT NULL DEFAULT 200,
    "perfFeeBps"             INTEGER  NOT NULL DEFAULT 1000,
    "hurdleBps"              INTEGER  NOT NULL DEFAULT 0,
    "softLockupDays"         INTEGER  NOT NULL DEFAULT 60,
    "targetApyLowBps"        INTEGER  NOT NULL,
    "targetApyHighBps"       INTEGER  NOT NULL,
    "spvJurisdiction"        TEXT     NOT NULL,
    "shareClass"             TEXT     NOT NULL DEFAULT 'A',
    "regExemption"           TEXT     NOT NULL,
    "disclaimers"            TEXT     NOT NULL,
    "targetMiningBps"        INTEGER  NOT NULL,
    "targetBtcTacticalBps"   INTEGER  NOT NULL,
    "targetUsdcBaseBps"      INTEGER  NOT NULL,
    "targetStableReserveBps" INTEGER  NOT NULL,
    "network"                TEXT,
    "contractAddress"        TEXT,
    "requiredSigners"        INTEGER  NOT NULL DEFAULT 2,
    "signersWhitelist"       TEXT     NOT NULL,
    "createdAt"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              DATETIME NOT NULL,
    "submittedAt"            DATETIME,
    "deployedAt"             DATETIME,
    "pausedAt"               DATETIME,
    "closedAt"               DATETIME,
    "createdBy"              TEXT     NOT NULL,
    "seededFromStudyId"      TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "VaultDeployment_ticker_key"          ON "VaultDeployment"("ticker");
CREATE INDEX        IF NOT EXISTS "VaultDeployment_status_idx"          ON "VaultDeployment"("status");
CREATE INDEX        IF NOT EXISTS "VaultDeployment_strategy_status_idx" ON "VaultDeployment"("strategy", "status");

CREATE TABLE IF NOT EXISTS "VaultDeploymentApproval" (
    "id"           TEXT     NOT NULL PRIMARY KEY,
    "deploymentId" TEXT     NOT NULL,
    "signerWallet" TEXT     NOT NULL,
    "signedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision"     TEXT     NOT NULL,
    "reason"       TEXT,
    CONSTRAINT "VaultDeploymentApproval_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "VaultDeployment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "VaultDeploymentApproval_deploymentId_signerWallet_key" ON "VaultDeploymentApproval"("deploymentId", "signerWallet");
CREATE INDEX        IF NOT EXISTS "VaultDeploymentApproval_deploymentId_idx"              ON "VaultDeploymentApproval"("deploymentId");

CREATE TABLE IF NOT EXISTS "ProjectionStudyRun" (
    "id"                 TEXT     NOT NULL PRIMARY KEY,
    "ranAt"              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy"          TEXT     NOT NULL,
    "label"              TEXT,
    "presetIds"          TEXT     NOT NULL,
    "matrixSize"         INTEGER  NOT NULL DEFAULT 1,
    "scenarioRunIds"     TEXT     NOT NULL,
    "methodologyVersion" TEXT     NOT NULL DEFAULT 'v1.0',
    "summary"            TEXT,
    "notes"              TEXT
);
CREATE INDEX IF NOT EXISTS "ProjectionStudyRun_ranAt_idx"              ON "ProjectionStudyRun"("ranAt");
CREATE INDEX IF NOT EXISTS "ProjectionStudyRun_createdBy_ranAt_idx"    ON "ProjectionStudyRun"("createdBy", "ranAt");

CREATE TABLE IF NOT EXISTS "AdminAudit" (
    "id"          TEXT     NOT NULL PRIMARY KEY,
    "occurredAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorWallet" TEXT     NOT NULL,
    "action"      TEXT     NOT NULL,
    "entityType"  TEXT     NOT NULL,
    "entityId"    TEXT     NOT NULL,
    "diff"        TEXT     NOT NULL,
    "ip"          TEXT,
    "userAgent"   TEXT
);
CREATE INDEX IF NOT EXISTS "AdminAudit_occurredAt_idx"              ON "AdminAudit"("occurredAt");
CREATE INDEX IF NOT EXISTS "AdminAudit_actorWallet_occurredAt_idx"  ON "AdminAudit"("actorWallet", "occurredAt");
CREATE INDEX IF NOT EXISTS "AdminAudit_entityType_entityId_idx"     ON "AdminAudit"("entityType", "entityId");
