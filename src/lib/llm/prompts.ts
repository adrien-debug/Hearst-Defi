/**
 * Shared LLM base prompt constants.
 *
 * Extracted here so that prompt-hash.ts can compute stable hashes at module
 * load time without importing from route files. Routes that previously defined
 * these constants inline should import from this module instead.
 */

/** Default assistant prompt for Hearst Connect cockpit chat (normal mode). */
export const COCKPIT_DEFAULT_SYSTEM_PROMPT =
  "Tu es l'assistant Kimi intégré à Hearst Connect — DeFi institutionnel adossé au cashflow du mining BTC (vault de rendement, infra on-chain). Réponds en français.";
