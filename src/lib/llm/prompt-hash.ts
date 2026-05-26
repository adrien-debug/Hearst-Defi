import { createHash } from "node:crypto";
import {
  REVIEW_FACILITATOR_PROMPT,
  REVIEW_DOCUMENT_INSTRUCTIONS,
} from "@/lib/agents/system-prompts/review";
import { COCKPIT_DEFAULT_SYSTEM_PROMPT } from "@/lib/llm/prompts";

/**
 * Computes a SHA-256 hex digest of `input`.
 * Returns a 64-character lowercase hex string.
 */
export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Stable hash for the review facilitator system prompt.
 * Computed once at module load — use this to stamp LlmRun rows from cockpit-chat
 * when running in review mode.
 *
 * Invariant: this hash captures HEARST_PRODUCT_CONTEXT (interpolated into the
 * prompt at module load). Converting the prompt to a lazy getter would make
 * this hash stale — update the doc and move computation to runtime if you do.
 */
export const REVIEW_FACILITATOR_HASH: string = sha256Hex(REVIEW_FACILITATOR_PROMPT);

/**
 * Stable hash for the review document generation system prompt.
 * Computed once at module load — use this to stamp LlmRun rows from the
 * review-document route.
 *
 * Invariant: this hash captures HEARST_PRODUCT_CONTEXT (interpolated into the
 * prompt at module load). Converting the prompt to a lazy getter would make
 * this hash stale — update the doc and move computation to runtime if you do.
 */
export const REVIEW_DOCUMENT_HASH: string = sha256Hex(REVIEW_DOCUMENT_INSTRUCTIONS);

/**
 * Stable hash for the default cockpit assistant system prompt (normal mode).
 * Computed once at module load — use this to stamp LlmRun rows from cockpit-chat
 * when running in normal mode.
 *
 * Unlike the review hashes, this hash does NOT capture HEARST_PRODUCT_CONTEXT
 * (the default cockpit prompt is independent of the product map).
 */
export const COCKPIT_DEFAULT_HASH: string = sha256Hex(COCKPIT_DEFAULT_SYSTEM_PROMPT);
