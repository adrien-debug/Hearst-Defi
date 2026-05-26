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

const NEGATION_WORDS = new Set(["not", "no", "never", "without"]);

/** Strip all non-alpha characters so hyphenated tokens like "not" in
 *  "guaranteed-not-applicable" are normalised correctly. */
function stripPunct(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Returns whether a match at `index` / `matchLength` is exempted because a
 * negation word (not / no / never / without) appears within a 3-word window
 * BEFORE **or** AFTER the matched forbidden word.
 *
 * Lookbehind: inspect the 3 words immediately preceding the match (up to 100
 * chars).  Words are split on whitespace only — punctuation is stripped from
 * each token before comparison, so "guaranteed-not-applicable" correctly
 * surfaces "not" in the post-match window.
 *
 * Lookahead: inspect the 3 words immediately following the match end (up to
 * 100 chars).  This handles "money-back guarantee, not applicable" and
 * "guarantee not on Tuesdays".
 */
function isNegated(text: string, index: number, matchLength: number): boolean {
  const WINDOW = 3;

  const before = text.slice(Math.max(0, index - 100), index);
  const after = text.slice(index + matchLength, index + matchLength + 100);

  // Split on whitespace OR hyphens so that hyphenated tokens like
  // "-not-applicable" are broken into individual words for negation checks.
  const beforeWords = before.split(/[\s-]+/).slice(-WINDOW);
  const afterWords = after.split(/[\s-]+/).slice(0, WINDOW);

  return [...beforeWords, ...afterWords].some((w) =>
    NEGATION_WORDS.has(stripPunct(w)),
  );
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
 * violation — the exception is implemented via a look-behind **and**
 * look-ahead window of 3 words around the match.
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
        if (isNegated(lower, idx, m[0].length)) continue;
        matches.push({ word, index: idx, length: m[0].length });
      }
    }

    // Sort by position so the caller can render them in text order
    matches.sort((a, b) => a.index - b.index);
    return matches;
  }, [text]);
}
