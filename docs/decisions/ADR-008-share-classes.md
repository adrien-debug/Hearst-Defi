# ADR-008 — Share classes: Class A (institutional) and Class B (large allocator)

**Status**: Accepted
**Date**: 2026-05-26
**Deciders**: Founder (Adrien) + Eng

## Context

MVP v1.0 shipped with a single share class for the Hearst Yield Vault: $250k minimum
ticket, 60-day soft lock-up, 1% management fee, 10% performance fee. This was intentional
— a single class kept subscription logic, P&L attribution, and smart contract design
simple while the platform found its initial LP base.

As V1 opens up (ADR-006), the product now targets two distinct investor profiles:

- **Institutional allocators** ($250k–$1M range) who value liquidity and are the
  current base.
- **Large allocators** ($1M+) who can tolerate longer lock-ups in exchange for
  meaningfully lower fees. This segment is materially larger by AUM and is the growth
  vector.

Competitive platforms (Maple Finance, Goldfinch v2, Ondo OUSG) all offer differentiated
fee/lock tiers. Without a second class, Hearst Yield Vault systematically underprices
large capital that is willing to stay locked longer.

A single evolving class (gradually adjusting terms for everyone) was considered and
rejected: it creates retroactive changes for existing LPs and destroys term clarity in
the offering documents.

## Decision

**Introduce two share classes for the Hearst Yield Vault (and every future vault by
default).**

### Prisma model — `ShareClass`

```prisma
model ShareClass {
  id          String   @id @default(cuid())
  vaultId     String
  code        String   // "A" | "B"
  minTicket   Decimal  // in USD
  lockupDays  Int
  mgmtFeeBps  Int      // basis points — 100 bps = 1 %
  perfFeeBps  Int      // basis points — 1000 bps = 10 %
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([vaultId, code])
}
```

### Class definitions (Hearst Yield Vault)

| Field        | Class A                    | Class B                        |
|--------------|----------------------------|--------------------------------|
| Code         | `A`                        | `B`                            |
| Min ticket   | $250,000                   | $1,000,000                     |
| Lock-up      | 60 days (soft)             | 90 days (soft)                 |
| Mgmt fee     | 100 bps (1 %)              | 75 bps (0.75 %)                |
| Perf fee     | 1000 bps (10 %)            | 800 bps (8 %)                  |
| Target LP    | Institutional standard     | Large allocators / patient cap |

Class B remunerates capital patience: the longer lock-up and larger ticket absorb
liquidity risk for the vault, and the fee discount reflects that premium.

## Rationale

1. **Competitive alignment.** Maple Pool 2 and Goldfinch v2 both gate lower fees behind
   longer committed capital. Offering a single fee schedule puts Hearst at a disadvantage
   when pitching $1M+ tickets.

2. **Capital stability.** Class B commitments extend the weighted average lock duration of
   the vault, reducing rollover pressure on the mining credit facilities that back the yield.

3. **Clarity over flexibility.** Two named classes with explicit terms are easier to
   represent in subscription agreements, Cayman SPV supplements, and LP statements than
   a single class with conditional terms.

4. **Incremental complexity.** Two classes is the minimum differentiation that captures
   the large-allocator segment. Three or more classes at this stage would fragment the
   LP base and complicate the subscription flow without proportional revenue benefit
   (see Alternatives section).

## Consequences

### What changes immediately

- **Prisma schema** adds the `ShareClass` model (see above). Migration is non-breaking:
  existing `VaultSnapshot`, `Allocation`, and `Distribution` rows are implicitly Class A
  until backfilled.
- **Subscription flow** must present a class selector before ticket size. The selected
  class determines which `minTicket`, `lockupDays`, and fee schedule apply to the
  subscription. No subscription row may be created without a `shareClassId`.
- **P&L and statements** become per-class: fee accruals, NAV per share, and distribution
  amounts are computed separately per class code. Agent outputs (`investor-memo`,
  `risk-explanation`) must reference the class in every projection context.
- **Methodology v2** draft must include a section on share class impact on net yield
  (gross APY range unchanged; net APY range shifts by ~20–25 bps between Class A and
  Class B at comparable gross returns).

### Smart contract implications

The ERC-4626 vault (Phase 3, gated on Spearbit audit per ADR-006) must handle two
share classes. Two implementation paths are under evaluation — a separate contract
per class versus a single multi-class contract — and will be decided in a dedicated
SC ADR before mainnet deployment. This ADR does not mandate the SC architecture; it
mandates that the SC layer supports two classes before any mainnet deploy.

### Non-negotiables unchanged

All CLAUDE.md non-negotiables (#1–#11) continue to apply. Notably:
- APY is always a **range** per class, never a single point.
- Every projection shows **assumptions** and a **"not guaranteed"** disclaimer.
- No forbidden words ("guarantee", "promise", "certain", "will deliver", "risk-free")
  in any agent output referencing class terms.

## Alternatives considered

### 1. Single evolving class

Keep one class and adjust terms (fee, lock-up) over time as the LP mix shifts.

Rejected: retroactive term changes require LP consent, create adverse selection
(existing LPs at old terms vs. new LPs at new terms in the same pool), and are
operationally complex to represent in offering documents.

### 2. Three or more classes (e.g. add Class C at $5M+)

Add a third tier for very large family offices and institutions.

Rejected for V1: the $1M–$5M segment is not yet large enough in the current pipeline
to justify the subscription complexity and legal cost of a third supplement. Class C
can be added via a future ADR once AUM data supports it.

### 3. Separate vaults per risk/fee profile (Defensive, BTC Plus as fee proxies)

Use multi-vault (ADR-006) to differentiate by risk profile rather than by fee tier.

Rejected as a substitute: vault differentiation is by **strategy**, not by allocator
size. Class B is a fee discount for the same Yield Vault strategy; it is not a
separate risk profile. The two mechanisms are orthogonal and both apply.

## Compliance note

The Cayman SPV structure for Hearst Yield Vault explicitly permits differentiated share
classes (Section 6 of the Investor Memo). Class A and Class B map to two supplement
series under the same master fund. US investors qualify both classes under Regulation D
Rule 506(b) (accredited investor standard). No new regulatory approval is required to
launch Class B; the existing subscription agreement template is updated to include a
class-election field.
