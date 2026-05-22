// Pure Bitcoin hashprice math — no I/O, no server-only — shared by the live
// fetcher (data/hashprice.ts) and the historical backfill so both derive
// $/TH/day from (difficulty, BTC price) with exactly one implementation.
//
//   network_hashrate_ths = difficulty × 2^32 / 600s / 1e12
//   hashprice_usd_th_day = block_reward × 144 × btc_price_usd / network_hashrate_ths

/** Bitcoin block reward (BTC) — post April 2024 halving. */
export const BLOCK_REWARD_BTC = 3.125;

/** Blocks per day on a 10-minute target. */
export const BLOCKS_PER_DAY = 144;

const HASHES_PER_DIFFICULTY = 2 ** 32;
const HASHES_PER_TH = 1e12;
const SECONDS_PER_BLOCK = 600;

/** Network hashrate (TH/s) implied by a difficulty value. */
export function networkHashrateThs(difficulty: number): number {
  return (difficulty * HASHES_PER_DIFFICULTY) / SECONDS_PER_BLOCK / HASHES_PER_TH;
}

/**
 * Hashprice (USD per TH per day) from network difficulty and BTC price.
 * Returns 0 for non-positive/degenerate inputs so callers can fall back rather
 * than propagate NaN/Infinity into the engine.
 */
export function deriveHashpriceUsdPerThDay(
  difficulty: number,
  btcPriceUsd: number,
  blockRewardBtc: number = BLOCK_REWARD_BTC,
): number {
  if (
    !Number.isFinite(difficulty) ||
    !Number.isFinite(btcPriceUsd) ||
    difficulty <= 0 ||
    btcPriceUsd <= 0
  ) {
    return 0;
  }
  const hashrate = networkHashrateThs(difficulty);
  if (hashrate <= 0) return 0;
  return (blockRewardBtc * BLOCKS_PER_DAY * btcPriceUsd) / hashrate;
}
