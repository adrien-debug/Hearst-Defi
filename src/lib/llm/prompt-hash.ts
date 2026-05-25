// NOTE: REVIEW_FACILITATOR_PROMPT et REVIEW_DOCUMENT_INSTRUCTIONS sont des
// template strings qui interpolent HEARST_PRODUCT_CONTEXT au moment de
// l'évaluation du module review.ts. Les hashes ci-dessous CAPTURENT donc
// aussi HEARST_PRODUCT_CONTEXT — toute modification de la carte produit
// invalidera automatiquement le hash. Si un futur dev convertit ces prompts
// en lazy-getters, ce commentaire doit être mis à jour ET le hash recalculé
// au runtime (pas au module level) sinon il sera stale.
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
 */
export const REVIEW_FACILITATOR_HASH: string = sha256Hex(REVIEW_FACILITATOR_PROMPT);

/**
 * Stable hash for the review document generation system prompt.
 * Computed once at module load — use this to stamp LlmRun rows from the
 * review-document route.
 */
export const REVIEW_DOCUMENT_HASH: string = sha256Hex(REVIEW_DOCUMENT_INSTRUCTIONS);

/**
 * Stable hash for the default cockpit assistant system prompt (normal mode).
 * Computed once at module load — use this to stamp LlmRun rows from cockpit-chat
 * when running in normal mode.
 */
export const COCKPIT_DEFAULT_HASH: string = sha256Hex(COCKPIT_DEFAULT_SYSTEM_PROMPT);
