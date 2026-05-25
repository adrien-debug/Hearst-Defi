/**
 * Token estimation and transcript-capping utilities.
 *
 * Used to prevent context-window overflow when building the transcript fed to
 * Kimi for the review-document generation pass.
 */

// Heuristic chars-to-tokens ratio for French + mixed markdown/code.
// Conservative middle ground:
//   - Pure French prose: ~0.25-0.27 tokens/char
//   - Markdown with code/JSON/URLs: ~0.32-0.40 (BPE splits symbols)
// We round up to 0.30 to stay safe on transcripts that mix both.
export const TOKENS_PER_CHAR_FR = 0.30;

/**
 * Hard cap on transcript tokens before sending to Kimi.
 *
 * Kimi K2.6 supports 128k+ context. We reserve headroom for:
 *   - system prompt (~2k tokens)
 *   - routesBlock + specsBlock (~3k tokens)
 *   - user framing text (~0.5k tokens)
 *   - model response (~4k tokens)
 * => 60k tokens for the transcript itself is safe.
 */
export const MAX_TRANSCRIPT_TOKENS = 60_000;

/**
 * Estimates the number of tokens in `text` using the French heuristic.
 * Returns 0 for an empty string.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length * TOKENS_PER_CHAR_FR);
}

/**
 * Caps a message array to `maxTokens` estimated tokens, keeping the most
 * recent messages and discarding the oldest ones.
 *
 * If the full array fits within `maxTokens`, it is returned as-is
 * (droppedCount = 0, no allocation).
 *
 * @param messages   Chronological array of chat messages.
 * @param maxTokens  Token budget (estimated, not exact).
 * @returns          `{ capped, droppedCount }` — capped is always in
 *                   chronological order.
 */
export function capTranscriptByTokens(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number,
): { capped: Array<{ role: string; content: string }>; droppedCount: number } {
  const total = messages.reduce(
    (acc, m) => acc + estimateTokens(m.content),
    0,
  );

  if (total <= maxTokens) {
    return { capped: messages, droppedCount: 0 };
  }

  let accumulated = 0;
  let keepFrom = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const t = estimateTokens(messages[i]!.content);
    if (accumulated + t > maxTokens) {
      break;
    }
    accumulated += t;
    keepFrom = i;
  }

  const capped = messages.slice(keepFrom);

  // Edge case: every message individually exceeds the budget (e.g. one 250k-char
  // paste). The loop above breaks immediately on the first iteration, leaving
  // keepFrom = messages.length and capped = []. Without this guard the caller
  // receives an empty transcript, producing a vacuous or hallucinated document.
  //
  // Recovery: take the last message, keep its tail (most recent content first),
  // and prefix with "[…] " to signal the internal truncation to the model.
  if (capped.length === 0 && messages.length > 0) {
    const last = messages[messages.length - 1]!;
    const rawMaxChars = Math.floor(maxTokens / TOKENS_PER_CHAR_FR) - 10;
    const maxChars = rawMaxChars > 0 ? rawMaxChars : 1000;
    const prefix = "[…] ";
    const truncatedContent =
      prefix + last.content.slice(last.content.length - maxChars);
    return {
      capped: [{ role: last.role, content: truncatedContent }],
      droppedCount: messages.length - 1,
    };
  }

  const droppedCount = messages.length - capped.length;
  return { capped, droppedCount };
}
