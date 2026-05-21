/**
 * safeUrl — pure URL allow-list helper (client + server safe, no "server-only").
 *
 * Returns the trimmed href only when the scheme is explicitly allowed.
 * Blocks javascript:, data:, vbscript:, and anything else not in the list.
 *
 * Allowed schemes (case-insensitive):
 *   https://  http://  /  ipfs://  mailto:
 */
export function safeUrl(href: string | null | undefined): string {
  if (href == null) return "";

  const trimmed = href.trim();
  if (trimmed.length === 0) return "";

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith("https://") ||
    lower.startsWith("http://") ||
    // Reject protocol-relative URLs (//host) — browsers treat them as https://host, bypassing the allow-list.
    (lower.startsWith("/") && !lower.startsWith("//")) ||
    lower.startsWith("ipfs://") ||
    lower.startsWith("mailto:")
  ) {
    return trimmed;
  }

  return "";
}
