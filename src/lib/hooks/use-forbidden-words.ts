"use client";

import { useMemo } from "react";

/**
 * Forbidden word list for wizard input validation.
 *
 * Mirrors the agent-output linter in `src/lib/agents/validators.ts` but
 * targets user-facing text fields, not LLM outputs. Word-boundary matched,
 * case-insensitive.
 *
 * Exception: "not guaranteed" (and other negated forms) is explicitly allowed
 * because disclaimer fields must contain that phrase per Non-negotiable #10.
 */
export const FORBIDDEN_WORDS = [
  "guarantee",
  "promise",
  "certain",
  "will deliver",
  "risk-free",
] as const;

export type ForbiddenWord = (typeof FORBIDDEN_WORDS)[number];

export interface ForbiddenMatch {
  /** The forbidden word that was matched. */
  word: ForbiddenWord;
  /** Zero-based start index of the match in the original text. */
  index: number;
  /** Length of the matched substring. */
  length: number;
}

/**
 * Returns whether a match at `index` for `word` is exempted because it is
 * preceded by a negation (not / no / never / without) within 3 words.
 *
 * We inspect the substring that ends immediately before the matched word.
 * If that substring ends with a negation word followed by 0–2 intermediate
 * words and then whitespace, the occurrence is considered negated.
 */
function isNegated(text: string, index: number): boolean {
  // Take up to 40 chars before the match — enough for "not at all guaranteed"
  const before = text.slice(Math.max(0, index - 40), index);
  // Pattern: negation word, whitespace, then optionally 1-2 intervening words
  // each followed by a space, finishing at the end of `before` (which is right
  // before the matched word in the original string).
  const negationPattern = /\b(not|no|never|without)\s+(?:\w+\s+){0,2}$/i;
  return negationPattern.test(before);
}

/**
 * `useForbiddenWords(text)` — client-side hook.
 *
 * Returns an array of `ForbiddenMatch` objects for every forbidden word found
 * in `text`. The array is memoised on the text value so callers can render it
 * without thrashing on every keystroke (React reconciles the array by object
 * identity unless the text actually changes).
 *
 * Special case: "not guaranteed" (and similar negated forms) is **not** a
 * violation — the exception is implemented via a lookbehind on the 3 words
 * preceding the match.
 */
export function useForbiddenWords(text: string): ForbiddenMatch[] {
  return useMemo(() => {
    const lower = text.toLowerCase();
    const matches: ForbiddenMatch[] = [];

    for (const word of FORBIDDEN_WORDS) {
      // Escape any regex meta-chars in the word itself (e.g. "-" in "risk-free")
      const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // \b word boundary before the word, then match the word (possibly followed
      // by word chars for inflected forms like "guaranteed", "promises").
      const pattern = new RegExp(`\\b${escaped}\\w*`, "gi");
      let m: RegExpExecArray | null;

      while ((m = pattern.exec(lower)) !== null) {
        const idx = m.index;
        // Skip negated occurrences ("not guaranteed", "no risk-free claim", …)
        if (isNegated(lower, idx)) continue;
        matches.push({ word, index: idx, length: m[0].length });
      }
    }

    // Sort by position so the caller can render them in text order
    matches.sort((a, b) => a.index - b.index);
    return matches;
  }, [text]);
}
