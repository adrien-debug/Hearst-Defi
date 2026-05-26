# ADR-009 — Multisig governance: Safe v1.4 + EIP-712 off-chain signing + OZ TimelockController

**Status**: Accepted
**Date**: 2026-05-26
**Deciders**: Founder (Adrien) + Eng

## Context

Governance proposals (parameter changes, allocation rebalances, vault upgrades) need
M-of-N approval before any on-chain execution. Two hard requirements drive the design:

1. **Gas-free signature collection.** LPs and operators should not bear gas costs
   for the approval phase; only the final execution transaction pays gas.
2. **Defense in depth.** A single compromised signer must not be sufficient to
   execute a proposal. A second layer — a time delay — must give observers a
   window to detect and cancel malicious actions before they take effect.

The industry standard for institutional DeFi governance is Safe Wallet (formerly
Gnosis Safe) combined with an on-chain timelock. Safe v1.4 introduces native
EIP-712 typed-data signing, which enables fully off-chain M-of-N signature
collection with replay protection bound to `chainId` + `verifyingContract`.

Safe v1.4 secures roughly $100 B AUM across mainnet deployments and has undergone
multiple independent audits, making it the lowest-risk foundation for a custody and
governance layer targeting institutional LPs.

## Decision

**Use Safe Wallet v1.4 with EIP-712 typed data for off-chain signature collection.
On-chain execution routes through the Safe contract + OpenZeppelin TimelockController
(48-hour delay by default).**

### Off-chain signature layer

- Every governance proposal is represented as a `SafeTransaction` struct hashed
  via the EIP-712 domain separator (`domainSeparator`) and `SafeTx` type hash.
- Signers submit `(r, s, v)` signatures off-chain; the coordinator collects them
  into `ProposalSignature` rows in Prisma (see Consequences below).
- The domain separator binds each signature to `chainId` + `verifyingContract`
  (the Safe address), preventing cross-chain and cross-Safe replay.
- Approve quorum: **3 of 5** signers. Cancel quorum: **1 of N** signers (any
  single signer may halt a proposal during the timelock window).

### On-chain execution layer

- Once M signatures are collected, any account may submit the `execTransaction`
  call to the Safe contract.
- The Safe's target for governance actions is the **OZ TimelockController**
  deployed with a **48-hour minimum delay**.
- Proposals must be `schedule`d on the timelock before being `execute`d, giving a
  public 48-hour observation window.
- Cancellation on-chain requires the `CANCELLER_ROLE` (held by the Safe itself,
  exercisable by 1-of-N off-chain quorum).

### Pure-function helpers

`src/lib/governance/eip712.ts` (pure, no I/O, no Prisma, no `Date.now()`):

- `hashSafeTx(tx, domainSeparator): Hex` — EIP-712 SafeTx hash
- `buildDomainSeparator(chainId, safeAddress): Hex` — domain separator
- `hashTimelockOperationId(target, value, data, predecessor, salt): Hex` — OZ
  timelock `operationId` for status lookups and cancellation

### Proposal state machine

Nine states, linear with two exit branches:

```
DRAFT → SIGNING → QUEUED → TIMELOCK → EXECUTABLE → EXECUTED
                      ↓                    ↓
                 REJECTED              CANCELLED
                                          ↓
                                       EXPIRED  (if execution window lapses)
```

- `DRAFT` — created, not yet open for signatures.
- `SIGNING` — open; collecting off-chain `(r, s, v)` signatures.
- `QUEUED` — M signatures reached; ready to call `execTransaction` → `schedule`.
- `TIMELOCK` — `schedule` sent; 48-hour delay running.
- `EXECUTABLE` — delay elapsed; `execute` may be called.
- `EXECUTED` — `execute` confirmed on-chain.
- `REJECTED` — cancelled before reaching quorum (off-chain, no gas).
- `CANCELLED` — cancelled during timelock via 1-of-N off-chain quorum + on-chain
  `cancel` call.
- `EXPIRED` — timelock `EXECUTABLE` window lapsed without execution; treated as
  cancelled; proposal must be re-created.

### UI surfaces

- **Signature collection page** (`/admin/governance/[id]`): lists signers,
  collects wallet signatures via EIP-712 `eth_signTypedData_v4`, shows quorum
  progress bar.
- **Timelock countdown** (`/proof-center`): public-facing, provenance badge
  `Attested`, shows remaining delay and proposal summary. LP-visible for
  transparency.

## Rationale

| Factor | Why it matters |
|---|---|
| Industry standard (~$100 B AUM) | Audited battle-hardened code; no custom attack surface |
| Gas-free signing | LPs and operators sign off-chain; only executor pays gas (once) |
| Multisig + Timelock = defense in depth | Two independent failure modes must be bypassed simultaneously |
| Cancel quorum (1 of N) < approve quorum (3 of 5) | Halting is easier than approving; asymmetric defense favors safety |
| EIP-712 chainId binding | Replay attacks across chains or Safe instances are structurally prevented |
| OZ TimelockController | Audited, widely deployed, composable with Safe; no custom timelock risk |

## Consequences

### Positive

- **No custom multisig code.** Safe v1.4 carries its own audit history; the
  codebase only adds pure-function helpers and a Prisma storage layer.
- **LP transparency.** The public timelock countdown on Proof Center lets LPs
  independently verify governance actions before they land on-chain — a strong
  institutional trust signal.
- **Asymmetric defense.** Any single signer can halt a proposal during the timelock
  window. Attackers need to compromise M signers AND wait 48 hours undetected.
- **Composable.** `TimelockController` integrates with the Phase 3 ERC-4626 vault
  and any future OpenZeppelin governance primitives without changes to Safe.

### Negative / risks

- **Smart contracts V1 must be updated** to set Safe owner addresses at deploy time
  and grant `PROPOSER_ROLE` / `EXECUTOR_ROLE` / `CANCELLER_ROLE` on the
  `TimelockController` correctly. Misconfiguration at deploy = locked vault.
  Mitigation: deploy scripts validated on Base Sepolia before mainnet.
- **Off-chain signature storage** (`ProposalSignature` in Prisma) is a centralized
  point of failure. If the DB is unavailable, signature collection stalls.
  Mitigation: signatures are recoverable from on-chain `execTransaction` calldata
  post-execution; pre-execution backup export added to admin UI.
- **48-hour delay blocks emergency responses.** If the vault is actively exploited,
  governance cannot patch faster than 48 hours via this path.
  Mitigation: a separate `EMERGENCY_ROLE` (held by the Safe, 3-of-5 quorum) may
  call `pause()` on the vault directly without the timelock, subject to the same
  mainnet-audit gate (ADR-006 #8).
- **EIP-712 UX complexity.** Institutional signers may use hardware wallets or
  custody APIs that require custom `eth_signTypedData_v4` flows. UI must handle
  Ledger, Fireblocks, and browser-wallet paths.

## Alternatives considered

| Alternative | Rejection reason |
|---|---|
| Custom multisig contract | Safe has $100 B AUM and multiple audits; rolling custom multisig adds attack surface with no benefit |
| No timelock (multisig only) | Loses defense-in-depth; a compromised M-of-N quorum could execute instantly without observer window |
| Direct on-chain signing (no off-chain collection) | Every signer pays gas for each approval; unacceptable for institutional operators |
| Snapshot off-chain voting (non-binding) | Does not produce executable on-chain actions; cannot replace a binding governance path for vault operations |

## Audit preparation

- **ABI freeze** includes Safe integration patterns: `execTransaction` signature,
  `TimelockController` `schedule` / `execute` / `cancel`, `PROPOSER_ROLE` /
  `EXECUTOR_ROLE` / `CANCELLER_ROLE` assignment.
- **Threat model** covers:
  - *Signature replay*: prevented by EIP-712 `chainId` + `verifyingContract`
    binding; test vectors in `src/lib/governance/__tests__/eip712.test.ts`.
  - *Front-running execution*: `execTransaction` is atomic; front-runner cannot
    extract value without the full payload. `nonce` on the Safe prevents double-
    execution of the same hash.
  - *Timelock bypass*: `EXECUTOR_ROLE` held only by the Safe; no EOA executor.
  - *Griefing via cancel*: 1-of-N cancel is intentional; social consensus required
    to re-queue a cancelled proposal (creates a log trail).
- **Mainnet gate unchanged** (ADR-006 #8): Safe integration ships to Base Sepolia
  first; mainnet deploy requires completed Spearbit audit + remediation.
