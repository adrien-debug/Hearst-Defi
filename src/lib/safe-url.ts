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

  // Normalize for security testing only: browsers strip internal \t/\n/\r and map \ → /,
  // so "/\evil.com" and "/ /evil.com" both resolve to "//evil.com" (off-origin).
  const norm = trimmed.replace(/[\t\n\r]/g, "").replace(/\\/g, "/").toLowerCase();

  if (
    norm.startsWith("https://") ||
    norm.startsWith("http://") ||
    // Reject protocol-relative URLs (//host) — browsers treat them as https://host, bypassing the allow-list.
    (norm.startsWith("/") && !norm.startsWith("//")) ||
    norm.startsWith("ipfs://") ||
    norm.startsWith("mailto:")
  ) {
    return trimmed;
  }

  return "";
}
