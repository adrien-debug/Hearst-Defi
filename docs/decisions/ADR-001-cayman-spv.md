# ADR-001 — Cayman ELP for fund structure

**Status**: Accepted
**Date**: 2026-05-13
**Deciders**: Product, Legal (to confirm with Cayman counsel)

## Context

Hearst Connect needs a regulatory structure to launch a single institutional vault for professional / qualified investors. Options considered: Reg D US, Cayman ELP, BVI, Switzerland/Liechtenstein.

## Decision

**Cayman Exempted Limited Partnership (ELP)** for the MVP launch.

## Rationale

- Institutional credibility: 80%+ of crypto-native institutional funds use Cayman.
- Setup: 4-6 weeks with established counsel (Maples / Walkers / Mourant / Ogier).
- Cost: ~$30-60k setup, ~$30-50k/yr running.
- Pro investors only, no retail KYC overhead.
- Compatible with on-chain ops (precedent: Galaxy, Anchorage tokenised funds).
- Admin fund handles KYC/KYB (no in-app KYC at MVP).

## Rejected alternatives

- **Reg D US**: adds 2-3 months for accreditation/blue sky compliance. Possible in V1.
- **BVI**: less prestigious vs Cayman for tier-1 LPs.
- **Suisse/Liechtenstein**: credible but 90+ days setup and narrower LP market.

## Consequences

- Need: fund counsel (Maples target), admin (Apex/Trident), audit (Withum/PwC).
- KYC/KYB outside app at MVP — admin fund executes.
- Tax: LP receives K-1 equivalent or Cayman partner statement.
- In-app structure changes: no KYC flow at MVP. Add for V1 if US Reg D layer added.

## Follow-ups

- Confirm with counsel: ELP vs SPC. SPC if multi-strategy planned in 12m.
- Subscription docs template (S11).
- Tax memo for LPs (S12).
