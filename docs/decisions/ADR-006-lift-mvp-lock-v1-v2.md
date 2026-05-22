# ADR-006 — Lift the MVP lock for V1/V2 scope (Monte Carlo, multi-vault, mainnet)

**Status**: Accepted
**Date**: 2026-05-22
**Deciders**: Founder (Adrien) + Eng

## Context

The MVP non-negotiables in `CLAUDE.md` deliberately fenced off three capabilities
to keep the first release small, deterministic, and legally conservative:

- **#7** — *No Monte Carlo at MVP, rule-based only.*
- **#8** — *Smart contracts: testnet event logger Phase 2, audited ERC-4626 Phase 3 only.*
- **#9** — *Single vault at MVP. No multi-vault UI abstractions until V1+.*

The MVP surfaces are now built (dashboard, scenario lab, proof center, portfolio,
admin), the ERC-4626 vault is written + tested on testnet (`a63926b`), custody PoR
is live (Fireblocks), and the rule-based engine is in place. The founder has
decided to open V1/V2 scope and build the rest of the platform end-to-end.

## Decision

**Lift the lock for the three capabilities below.** Each becomes allowed scope,
but every one keeps a hard guardrail so the lift is not a blank cheque.

### 1. Monte Carlo (lifts #7)

- A **Monte Carlo simulation mode** is allowed **alongside** the rule-based engine,
  not replacing it. Rule-based stays the default.
- The engine stays **pure-function** (ADR/engine purity rule unchanged): the PRNG
  **seed is injected**, never `Math.random()` ungoverned, never `Date.now()`.
  Same seed ⇒ same output ⇒ snapshot-testable.
- Probabilistic outputs require **Methodology v2.0** (this ADR ships it). Forward
  APY is still reported as a **range** (non-negotiable #1 unchanged); MC adds a
  distribution (p5/p50/p95) but the headline stays a range, never a single point.
- Forbidden-words rule (#5) and "not guaranteed" disclaimer (#10) still apply to
  every MC output.

### 2. Multi-vault (lifts #9)

- More than one vault is allowed: **Hearst Yield Vault** (existing), **Hearst
  Defensive Vault**, **Hearst BTC Plus Vault**. Multi-vault UI abstractions are now
  permitted.
- Each vault carries its **own methodology assumptions, share classes, and
  provenance**. No vault may reuse another's numbers silently.
- The data model must make the vault id a first-class key (no hardcoded single vault).

### 3. Mainnet ERC-4626 (lifts #8) — **conditionally**

- Writing mainnet-ready contracts, deploy scripts, and a deploy *runbook* is now
  allowed.
- **The actual mainnet deployment remains gated on a completed Spearbit audit +
  remediation** (`audit-final` roadmap item). Lifting #8 does **not** authorize
  pushing unaudited code to Base mainnet. Testnet (Base Sepolia) deploys are free.

## Explicitly still forbidden

- **Auto-execution** of rebalances stays **forbidden** for now (was an `auto-execution`
  todo). Rebalancing remains PTAI (Projection → Trigger → Action → Impact) and
  human-approved. Revisit in a later ADR.
- Non-negotiables **#1 (APY as range), #2 (provenance badges), #3 (PTAI), #4 (no AI
  chat), #5 (forbidden words), #6 (engine purity), #10 (assumptions + disclaimer),
  #11 (no cross-project imports)** are **unchanged and still enforced**.

## Consequences

- `CLAUDE.md` non-negotiables #7/#8/#9 are rewritten to reflect the lift (see same commit).
- A new `docs/methodology/v2.0.md` is published for the Monte Carlo projection mode;
  v1.0 stays the immutable rule-based reference.
- The roadmap items `monte-carlo`, `vault-defensive`, `vault-btc-plus`, `vault-mainnet`
  move from "blocked by lock" to "buildable" (mainnet deploy still blocked by audit).
- `auto-execution` stays todo/forbidden until a future ADR lifts it.
