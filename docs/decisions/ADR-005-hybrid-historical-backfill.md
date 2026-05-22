# ADR-005 — Hybrid historical backfill (real APIs + deterministic synthetic fallback)

**Status**: Accepted
**Date**: 2026-05-22
**Deciders**: Eng

## Context

The `data-backfill` roadmap item needs ~36 months of daily `MiningMetric`
history (hashprice, difficulty, BTC price) to power charts, the mining-health
agent, and richer backtests. The free public sources are imperfect: CoinGecko's
daily `market_chart` is coverage-/rate-limited without a paid key, mempool.space
can rate-limit, and neither is deterministic — yet the backfill must be
reproducible and must not block on an upstream outage.

## Decision

**Hybrid, per-series**: try the real API; on failure or insufficient coverage,
fall back to a **deterministic synthetic series**.

- BTC price → CoinGecko `market_chart`, else synthetic path.
- Difficulty → mempool.space `difficulty-adjustments/[interval]`, forward-filled to daily, else synthetic.
- **Provenance** (`api` | `synthetic`) is reported per series.
- Hashprice is always derived from `(difficulty, BTC)` via the shared formula (`hashprice-formula.ts`) — one implementation for live + backfill.
- Write is **idempotent by UTC day** (`pnpm db:backfill [months]`), so it is safe to re-run and composes with the seed.

## Rationale

- **Reproducible + resilient**: the backfill always completes; synthetic data is deterministic.
- **Real where possible**: in practice mempool difficulty came back live (real EH/s trajectory) while BTC fell back to synthetic — exactly the intended graceful degradation.
- **No silent NaN**: gaps are backstopped synthetically.

## Consequences

- Synthetic BTC is *plausible, not real* — always surfaced via provenance so downstream never mistakes it for ground truth.
- The hashprice formula is now a single shared module; the live fetcher (`data/hashprice.ts`) was refactored onto it.
