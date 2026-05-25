/**
 * Kimi K2.6 cost estimation helpers.
 *
 * Pricing reference: Hypercli public pricing page (as of 2026-05).
 * NOTE: These are indicative list prices. Actual billing from Hypercli invoices
 * may differ — update the constants once the first invoice is received.
 *
 * Kimi K2.6 via Hypercli:
 *   Input:  $0.60 / 1M tokens
 *   Output: $2.50 / 1M tokens
 */

/** USD per million input tokens — Kimi K2.6 via Hypercli (indicative). */
export const KIMI_K2_6_INPUT_USD_PER_MTOK = 0.60;

/** USD per million output tokens — Kimi K2.6 via Hypercli (indicative). */
export const KIMI_K2_6_OUTPUT_USD_PER_MTOK = 2.50;

/**
 * Estimates the cost in USD for a Kimi K2.6 call.
 *
 * @param usage  Token counts from the API response `usage` field.
 * @returns      Estimated cost in USD, rounded to 6 decimal places.
 */
export function estimateKimiCostUsd(usage: {
  prompt_tokens: number;
  completion_tokens: number;
}): number {
  const inputCost = (usage.prompt_tokens * KIMI_K2_6_INPUT_USD_PER_MTOK) / 1_000_000;
  const outputCost = (usage.completion_tokens * KIMI_K2_6_OUTPUT_USD_PER_MTOK) / 1_000_000;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}
