/** Shared display helpers for on-chain addresses, hashes, and PoR periods. */

/** YYYYMM bigint → `YYYY-MM`. */
export function formatPeriod(period: bigint): string {
  const raw = period.toString();
  if (raw.length !== 6) return raw;
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function truncateHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

/** Alias for tx hashes (same truncation rule as `truncateHash`). */
export const truncateTx = truncateHash;
