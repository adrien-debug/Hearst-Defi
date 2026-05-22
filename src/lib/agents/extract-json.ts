/**
 * Extracts a JSON object from a model response.
 *
 * The system prompt asks for pure JSON, but we strip an accidental
 * ```json fence defensively rather than failing the whole pipeline on a
 * stray triple-backtick.
 */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced && fenced[1] !== undefined ? fenced[1] : trimmed;
  return JSON.parse(candidate);
}
