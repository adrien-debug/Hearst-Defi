-- CreateTable
CREATE TABLE "VaultSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aumUsdc" DECIMAL NOT NULL,
    "currentApyLow" DECIMAL NOT NULL,
    "currentApyHigh" DECIMAL NOT NULL,
    "stressedApy" DECIMAL NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "miningMarginScore" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'computed'
);

-- CreateTable
CREATE TABLE "Allocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "snapshotId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "pct" DECIMAL NOT NULL,
    "valueUsdc" DECIMAL NOT NULL,
    "yieldContributionBps" DECIMAL NOT NULL,
    CONSTRAINT "Allocation_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "VaultSnapshot" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MiningMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "takenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hashprice" DECIMAL NOT NULL,
    "difficulty" DECIMAL NOT NULL,
    "btcPrice" DECIMAL NOT NULL,
    "energyCost" DECIMAL NOT NULL,
    "uptimePct" DECIMAL NOT NULL,
    "deployedHashrate" DECIMAL NOT NULL,
    "miningMarginScore" INTEGER NOT NULL,
    "hashpriceTrendPct" DECIMAL NOT NULL,
    "operationalConfidence" INTEGER NOT NULL,
    "alertLevel" TEXT,
    "summary" TEXT,
    "recommendation" TEXT
);

-- CreateTable
CREATE TABLE "ScenarioRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "preset" TEXT,
    "inputs" TEXT NOT NULL,
    "outputs" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "narrative" TEXT,
    "riskWarning" TEXT,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "methodologyVersion" TEXT NOT NULL DEFAULT 'v1.0'
);

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "backtestKey" TEXT NOT NULL,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "initialCapital" DECIMAL NOT NULL,
    "rulesMode" TEXT NOT NULL,
    "endingValue" DECIMAL NOT NULL,
    "totalReturnPct" DECIMAL NOT NULL,
    "maxDrawdownPct" DECIMAL NOT NULL,
    "worstMonthPct" DECIMAL NOT NULL,
    "numRebalances" INTEGER NOT NULL,
    "monthlySeries" TEXT NOT NULL,
    "narrative" TEXT
);

-- CreateTable
CREATE TABLE "RebalanceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "executedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,
    "triggerText" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "impactText" TEXT NOT NULL,
    "fromAllocation" TEXT NOT NULL,
    "toAllocation" TEXT NOT NULL,
    "txHash" TEXT,
    "approvedBy" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Distribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distributedAt" DATETIME NOT NULL,
    "amountUsdc" DECIMAL NOT NULL,
    "txHash" TEXT,
    "recipientsCount" INTEGER NOT NULL,
    "period" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proofType" TEXT NOT NULL,
    "period" TEXT,
    "hash" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedBy" TEXT NOT NULL,
    "txHash" TEXT
);

-- CreateTable
CREATE TABLE "ReportExport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedBy" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "scenariosIncluded" TEXT NOT NULL,
    "backtestsIncluded" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "content" TEXT,
    "userId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoadmapValidation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "validatedBy" TEXT,
    "validatedAt" DATETIME,
    "notes" TEXT,
    "blockers" TEXT,
    "evidenceUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT,
    "pathname" TEXT,
    "message" TEXT NOT NULL,
    "author" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CockpitChat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CockpitMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chatId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CockpitMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "CockpitChat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LlmRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentName" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptHash" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "costUsd" REAL,
    "userId" TEXT
);

-- CreateIndex
CREATE INDEX "VaultSnapshot_takenAt_idx" ON "VaultSnapshot"("takenAt");

-- CreateIndex
CREATE INDEX "Allocation_snapshotId_idx" ON "Allocation"("snapshotId");

-- CreateIndex
CREATE INDEX "MiningMetric_takenAt_idx" ON "MiningMetric"("takenAt");

-- CreateIndex
CREATE INDEX "ScenarioRun_ranAt_idx" ON "ScenarioRun"("ranAt");

-- CreateIndex
CREATE INDEX "ScenarioRun_userId_ranAt_idx" ON "ScenarioRun"("userId", "ranAt");

-- CreateIndex
CREATE INDEX "ScenarioRun_userId_createdAt_idx" ON "ScenarioRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BacktestRun_backtestKey_idx" ON "BacktestRun"("backtestKey");

-- CreateIndex
CREATE INDEX "BacktestRun_userId_createdAt_idx" ON "BacktestRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RebalanceEvent_executedAt_idx" ON "RebalanceEvent"("executedAt");

-- CreateIndex
CREATE INDEX "Distribution_distributedAt_idx" ON "Distribution"("distributedAt");

-- CreateIndex
CREATE INDEX "Proof_proofType_period_idx" ON "Proof"("proofType", "period");

-- CreateIndex
CREATE INDEX "ReportExport_generatedAt_idx" ON "ReportExport"("generatedAt");

-- CreateIndex
CREATE INDEX "ReportExport_userId_generatedAt_idx" ON "ReportExport"("userId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoadmapValidation_itemId_key" ON "RoadmapValidation"("itemId");

-- CreateIndex
CREATE INDEX "RoadmapValidation_status_idx" ON "RoadmapValidation"("status");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "Feedback_itemId_idx" ON "Feedback"("itemId");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CockpitChat_userId_updatedAt_idx" ON "CockpitChat"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "CockpitMessage_chatId_createdAt_idx" ON "CockpitMessage"("chatId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmRun_createdAt_idx" ON "LlmRun"("createdAt");

-- CreateIndex
CREATE INDEX "LlmRun_agentName_idx" ON "LlmRun"("agentName");

-- CreateIndex
CREATE INDEX "LlmRun_status_idx" ON "LlmRun"("status");

-- CreateIndex
CREATE INDEX "LlmRun_userId_createdAt_idx" ON "LlmRun"("userId", "createdAt");

