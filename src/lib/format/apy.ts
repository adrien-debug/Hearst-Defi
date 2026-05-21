/**
 * Shared APY range formatter. Pure function — no server-only, no I/O.
 * Used by memo-data.ts (digits=1), investor-memo.ts (digits=2),
 * and scenario-narrative.ts (digits=2).
 */
export function formatApyRange(
  range: { low: number; high: number },
  digits = 1,
): string {
  return `${range.low.toFixed(digits)}-${range.high.toFixed(digits)}%`;
}
