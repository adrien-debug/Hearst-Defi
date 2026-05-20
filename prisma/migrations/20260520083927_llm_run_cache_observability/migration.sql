-- Migration: llm_run_cache_observability
-- Adds prompt-caching observability columns to LlmRun.
--
-- All new columns are nullable so existing rows remain valid:
--   - cacheCreationInputTokens: tokens written to Anthropic cache (first run of a system prompt)
--   - cacheReadInputTokens: tokens read from cache (subsequent hits — the cost reduction)
--   - systemPromptHash: sha256 of the cached system blocks, groups runs by prompt version
--
-- Index on systemPromptHash enables hit-rate aggregation per prompt revision.

ALTER TABLE "LlmRun" ADD COLUMN "cacheCreationInputTokens" INTEGER;
ALTER TABLE "LlmRun" ADD COLUMN "cacheReadInputTokens" INTEGER;
ALTER TABLE "LlmRun" ADD COLUMN "systemPromptHash" TEXT;

CREATE INDEX "LlmRun_systemPromptHash_idx" ON "LlmRun"("systemPromptHash");
