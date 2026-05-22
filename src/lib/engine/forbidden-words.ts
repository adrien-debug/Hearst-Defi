/**
 * Forbidden vocabulary for engine outputs.
 *
 * Source of truth shared across the pure engine layer.
 * Agents layer imports from here (not the reverse) to respect layering.
 *
 * See CLAUDE.md non-negotiable #5.
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
 * Throws if `text` contains any forbidden word (case-insensitive).
 * Allows negated forms ("not guaranteed", "no promise").
 */
export function assertNoForbiddenWords(text: string, label?: string): void {
  const haystack = text.toLowerCase();
  for (const needle of FORBIDDEN_WORDS) {
    const needlePattern = new RegExp(
      `\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\w*`,
    );
    if (!needlePattern.test(haystack)) continue;

    const negatedPattern = new RegExp(
      `\\b(not|no|never|without)\\s+(\\w+\\s+){0,3}${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    );
    const needleStartsWithNegation = /^(not|no|never|without)\b/.test(needle);
    if (!needleStartsWithNegation && negatedPattern.test(haystack)) continue;

    throw new Error(
      `Forbidden word "${needle}" detected${label ? ` in ${label}` : ""}. ` +
        `Hearst outputs must not use unconditional language.`,
    );
  }
}
