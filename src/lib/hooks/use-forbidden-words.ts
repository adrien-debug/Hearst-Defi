"use client";

import { useMemo } from "react";

import {
  FORBIDDEN_WORDS as CANONICAL_FORBIDDEN_WORDS,
  findForbiddenMatches,
  type ForbiddenMatchRange,
  type ForbiddenWord,
} from "@/lib/agents/forbidden-words";

/**
 * Forbidden word list for wizard input validation.
 *
 * Re-exports the canonical list from `@/lib/agents/forbidden-words` so the
 * wizard hook stays in lock-step with the agent validator, the vault server
 * actions, the notification template loader, and the PDF safety checks.
 *
 * Exception: "not guaranteed" (and other negated forms) is explicitly allowed
 * because disclaimer fields must contain that phrase per Non-negotiable #10.
 * The exemption is implemented by the canonical 3-word negation window.
 */
export const FORBIDDEN_WORDS = CANONICAL_FORBIDDEN_WORDS;

export type { ForbiddenWord };

export interface ForbiddenMatch {
  /** The forbidden word that was matched. */
  word: ForbiddenWord;
  /** Zero-based start index of the match in the original text. */
  index: number;
  /** Length of the matched substring. */
  length: number;
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
 * look-ahead window of 3 words around the match, enforced by the canonical
 * matcher in `@/lib/agents/forbidden-words`.
 */
export function useForbiddenWords(text: string): ForbiddenMatch[] {
  return useMemo<ForbiddenMatch[]>(
    () =>
      findForbiddenMatches(text).map(
        (r: ForbiddenMatchRange): ForbiddenMatch => ({
          word: r.word,
          index: r.index,
          length: r.length,
        }),
      ),
    [text],
  );
}
