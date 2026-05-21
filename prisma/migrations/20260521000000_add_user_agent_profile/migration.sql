-- Migration: add_user_agent_profile
--
-- Adds UserAgentProfile model for per-user LLM persona and memory preferences.
-- Each row stores tone/language/verbosity/customInstructions for a given
-- (userId, agentName) pair. The unique constraint ensures one profile per
-- user per agent.
--
-- Statement uses CREATE TABLE IF NOT EXISTS for idempotency on SQLite.

CREATE TABLE IF NOT EXISTS "UserAgentProfile" (
    "id"                 TEXT     NOT NULL PRIMARY KEY,
    "userId"             TEXT     NOT NULL,
    "agentName"          TEXT     NOT NULL,
    "tone"               TEXT,
    "language"           TEXT,
    "verbosity"          TEXT,
    "customInstructions" TEXT,
    "createdAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAgentProfile_userId_agentName_key" ON "UserAgentProfile"("userId", "agentName");
CREATE INDEX        IF NOT EXISTS "UserAgentProfile_userId_idx"            ON "UserAgentProfile"("userId");
