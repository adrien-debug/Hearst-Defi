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

const COMPACT_USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const BTC_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 4,
});

const UTC_MEDIUM_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const UTC_LONG_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatUsdCompact(value: number): string {
  return COMPACT_USD_FORMATTER.format(value);
}

export function formatBtc(value: number): string {
  return `${BTC_FORMATTER.format(value)} BTC`;
}

export function formatUtcDateMedium(value: Date): string {
  return UTC_MEDIUM_DATE_FORMATTER.format(value);
}

export function formatUtcDateTimeLong(value: Date): string {
  return UTC_LONG_DATE_TIME_FORMATTER.format(value);
}
