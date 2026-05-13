# ADR-003 — Revenue-share mining (no SPV / no fleet)

**Status**: Accepted
**Date**: 2026-05-13
**Deciders**: Product

## Context

The vault needs Bitcoin mining cashflow exposure. Three options: operate own fleet (SPV with ASICs), tokenised mining yield products (Marathon, Galaxy, etc.), revenue-share with existing farms.

## Decision

**Revenue-share with 1-2 existing mining farms** for MVP and V1.

## Rationale

- **Capex-light**: no ASIC procurement, no hosting contracts, no electricity contracts.
- **Time-to-market**: 4-8 weeks to negotiate 1-2 partner contracts vs 6-9 months to set up a mining SPV.
- **Operational risk transferred**: partner manages ASICs, hosting, pool, fleet uptime.
- **Differentiation maintained**: the rules engine + scenario lab + simulator are the product — the source of yield is secondary.
- **Optionality preserved**: V2+ can add additional partners or evaluate own fleet if scale justifies.

## Rejected

- **Own SPV with ASICs**: 6-9 months setup, capex $5-20M, operational headcount, electricity volatility risk on balance sheet.
- **Tokenised products (Marathon, Galaxy)**: margin too thin, differentiation weak, reliant on listed-company performance.

## Consequences

- Need partner contract template (revenue-share %, monthly settlement in USDC, attestation cadence).
- On-chain Mining Attestation: partner signs monthly production data, hash posted to PoR Registry.
- Counterparty risk explicit: top driver in `counterparty_risk` score.
- Disclosure: LP memo names the partner(s) under NDA-permitting terms or anonymised by geography.

## Follow-ups

- Identify and engage 2 candidate farms (US-based or EU-based, post-halving margin viable, attested operational track).
- Draft partner contract (S2-S3).
- Mock attestation system for MVP demo (signed locally by Hearst key).
