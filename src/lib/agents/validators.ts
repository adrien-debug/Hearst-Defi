/**
 * Post-validation linters for agent outputs.
 *
 * These functions throw on violation so the agent pipeline fails fast and
 * the bad output never reaches the caller / UI / PDF.
 *
 * Source of truth for forbidden vocabulary: `./forbidden-words.ts`
 * (canonical module — also consumed by wizard hook, vault server actions,
 * notification template loader, PDF safety checks).
 */

import {
  containsForbidden,
  FORBIDDEN_WORDS as CANONICAL_FORBIDDEN_WORDS,
} from "./forbidden-words";

// Re-export so existing call-sites (`import { FORBIDDEN_WORDS } from
// "@/lib/agents/validators"`) keep working without churn.
export const FORBIDDEN_WORDS = CANONICAL_FORBIDDEN_WORDS;

/**
 * Throws if `text` contains any of `FORBIDDEN_WORDS` (case-insensitive,
 * inflection-aware: `guaranteed`, `guarantees`, `guaranteeing`, `promises`,
 * `promised`, `certainly`, `certainty` are all caught).
 *
 * Legally-mandated disclaimer fields are NOT special-cased: their negated
 * forms ("outcomes are not guaranteed", "no promise of returns") are already
 * exempted by the 3-word negation window in `containsForbidden`, so the
 * linter still runs on them and would catch an unconditional positive claim
 * that slipped into a disclaimer.
 */
export function assertNoForbiddenWords(text: string): void {
  const result = containsForbidden(text);
  if (!result) return;
  // Report the first match in declaration order — matches the previous
  // behaviour and keeps existing test expectations green.
  const first = result.found[0]!;
  throw new Error(
    `Forbidden word "${first}" detected in agent output. ` +
      `Hearst agents must not use unconditional language. ` +
      `Rewrite the offending sentence.`,
  );
}

/**
 * Throws if `text` does not cite at least one assumption. We accept all
 * inflections of "assume" (assumption, assumes, assuming, assumed) and the
 * French "hypothèse" because institutional copy occasionally uses any of these.
 */
export function assertCitesAssumption(text: string): void {
  if (!/assum[ep]|assuming|assumed|assumption|assumes|hypoth[èe]se/i.test(text)) {
    throw new Error(
      "Agent output does not reference any assumption. " +
        "Every projection must explicitly cite at least one assumption " +
        '(e.g. "Under the assumption that hashprice stays flat..."). ' +
        "Rewrite the narrative to surface the assumption.",
    );
  }
}
