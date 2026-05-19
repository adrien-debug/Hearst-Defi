/**
 * Post-validation linters for agent outputs.
 *
 * These functions throw on violation so the agent pipeline fails fast and
 * the bad output never reaches the caller / UI / PDF.
 *
 * Source of truth for forbidden vocabulary: CLAUDE.md "Non-negotiables" and
 * `/docs/spec/09-agents.mdx`.
 */

export const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "certain",
  "will deliver",
  "risk-free",
  "no risk",
] as const;

/**
 * Throws if `text` contains any of `FORBIDDEN_WORDS` (case-insensitive).
 *
 * Detection is prefix-anchored with a free suffix (`\bguarantee\w*`) so that
 * inflected forms are still caught: "guaranteed", "guarantees", "promised",
 * "promises", "certainly", "certainty". A leading word boundary still prevents
 * matching mid-word (e.g. it won't fire inside an unrelated longer token).
 *
 * Legally-mandated disclaimer fields are NOT special-cased: their negated forms
 * ("outcomes are not guaranteed", "no promise of returns") are already exempted
 * by the negation rule below, so the linter still runs on them and would catch
 * an unconditional positive claim that slipped into a disclaimer.
 */
export function assertNoForbiddenWords(text: string): void {
  const haystack = text.toLowerCase();
  for (const needle of FORBIDDEN_WORDS) {
    const needlePattern = new RegExp(
      `\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`,
    );
    if (!needlePattern.test(haystack)) continue;
    // Allow negated forms: "not guaranteed", "never promises"
    const negatedPattern = new RegExp(
      `\\b(not|no|never|without)\\s+(\\w+\\s+){0,3}${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    );
    // Do not apply negation exemption for needles that start with a negation word
    // (e.g., "no risk" — "no" is both the needle prefix and a negation word)
    const needleStartsWithNegation = /^(not|no|never|without)\b/.test(needle);
    if (!needleStartsWithNegation && negatedPattern.test(haystack)) continue;
    throw new Error(
      `Forbidden word "${needle}" detected in agent output. ` +
        `Hearst agents must not use unconditional language. ` +
        `Rewrite the offending sentence.`,
    );
  }
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
