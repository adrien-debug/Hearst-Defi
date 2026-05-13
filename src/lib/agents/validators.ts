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

export type ForbiddenWord = (typeof FORBIDDEN_WORDS)[number];

/**
 * Throws if `text` contains any of `FORBIDDEN_WORDS` (case-insensitive).
 * Matches substrings deliberately: "guaranteed" still contains "guarantee".
 */
export function assertNoForbiddenWords(text: string): void {
  const haystack = text.toLowerCase();
  for (const needle of FORBIDDEN_WORDS) {
    if (haystack.includes(needle)) {
      throw new Error(
        `Forbidden word "${needle}" detected in agent output. ` +
          `Hearst agents must not use unconditional language. ` +
          `Rewrite the offending sentence.`,
      );
    }
  }
}

/**
 * Throws if `text` does not cite at least one assumption. We accept the
 * English forms ("assumption", "assumes") and the French "hypothèse" because
 * institutional copy occasionally slips between the two.
 */
export function assertCitesAssumption(text: string): void {
  if (!/assumption|assumes|hypoth[èe]se/i.test(text)) {
    throw new Error(
      "Agent output does not reference any assumption. " +
        "Every projection must explicitly cite at least one assumption " +
        '(e.g. "Under the assumption that hashprice stays flat..."). ' +
        "Rewrite the narrative to surface the assumption.",
    );
  }
}
