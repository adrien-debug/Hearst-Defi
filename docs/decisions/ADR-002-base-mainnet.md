# ADR-002 — Base as primary chain

**Status**: Accepted
**Date**: 2026-05-13
**Deciders**: Engineering, Product

## Context

Need to choose a chain for the vault contract deployment. Options: Ethereum mainnet, Base, Arbitrum, Optimism, Solana.

## Decision

**Base** as primary chain. **Ethereum mainnet** for RWA custody links (V1).

## Rationale

- Base: low gas cost (~$0.01-0.05 / tx), Coinbase distribution, growing institutional adoption.
- Ethereum mainnet: where RWA tokenised products live (Ondo USDY, Maple), required for institutional credibility.
- Arbitrum / Optimism: viable but less institutional momentum than Base in 2026.
- Solana: ecosystem strong but not where RWA institutional rails sit.

## Phases

- **Phase 1 (MVP demo)**: no on-chain contracts, paper vault.
- **Phase 2 (Sprint 13)**: Event Logger + PoR Registry on **Base Sepolia (testnet)**.
- **Phase 3 (V1, post-audit)**: ERC-4626 vault on **Base mainnet**.
- **V1+**: Ethereum mainnet contracts for RWA bridges if needed.

## Rejected at MVP

- Multi-chain deployment (Arbitrum, Solana, etc.) — adds complexity, no LP demand justified.
- Native cross-chain bridging — V2+ only.

## Consequences

- Choose USDC (Coinbase-native, multichain).
- Audit firm should be familiar with OP Stack chains (Spearbit is fine).
- Indexer: simple Ponder on Base RPC, no The Graph.

## Follow-ups

- Confirm Base account abstraction tooling for LP deposits (V1).
- Bridge strategy for RWA (Ethereum mainnet → Base) — V1+.
