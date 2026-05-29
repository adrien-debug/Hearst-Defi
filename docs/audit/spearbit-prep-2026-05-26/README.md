# Spearbit Audit Preparation Pack — Hearst Yield Vault

**Prepared by:** Hearst Corporation DeFi Engineering
**Contact:** adrien@hearstcorporation.io
**Original pack date:** 2026-05-26
**Reconciled:** 2026-05-29 (pack realigned to the actual frozen code — see "Reconciliation note" below)
**Codebase freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`

---

## Reconciliation note (2026-05-29)

The first draft of this pack (frozen at `8ba18c99`) described a contract API that the
codebase never implemented (`subscribe()`, `distribute()`, `rebalance()`, `pauseVault()`,
a `ReentrancyGuard`, a `PoRRegistry.updateBalance()` with `ORACLE_UPDATER_ROLE`, and an
EIP-712/`permit` surface inside the vault). **None of those exist in `contracts/src/`.**

This pack has been rewritten so that **every claim points to code that exists at the
freeze SHA above**. The contracts themselves were not changed during reconciliation —
`git diff 79d0ef9 898991c -- contracts/src/` is empty (the last contract change was the
B6 guardian/Pausable work at `79d0ef9`; everything since is docs, deploy scripts, tests
and app code). Verify with:

```
git diff 79d0ef9 898991c -- contracts/src/   # expected: empty
```

---

## Product Overview

Hearst Yield Vault is a single-vault institutional DeFi product offering mining-backed
structured yield with monthly USDC distributions. Target APY range: 8–15% (always a range,
never a single point). Minimum ticket: $250,000 USD. Soft lock-up: 60 days. Legal structure:
Cayman SPV.

**Critical framing for auditors:** the $250k minimum and the 60-day soft lock-up are
**off-chain controls** (KYC via Persona + the Cayman LPA). On-chain, `minDeposit` is an
*indicative, owner-mutable floor* and **there is no lock-up enforced in the contract**. The
vault is a share-accounting ERC-4626 wrapper; real yield is generated off-chain and reflected
on-chain when the manager transfers USDC into the vault.

The system is composed of:

- **Three custom Solidity contracts** (`contracts/src/`) on Base Sepolia (testnet phase),
  targeted for Base mainnet **post-audit only**.
- **Governance wiring** on audited dependencies: an OZ `TimelockController` (48h) owned by a
  Gnosis **Safe 3/5**. Configuration is in scope; the OZ/Safe code is not.
- A Next.js 16 admin console, a pure-function scenario engine, four LLM agents (structured
  JSON only), Inngest jobs, and Fireblocks (Viewer read-only) — all **out of contract scope**
  (see `scope.md`).

---

## Audit Firm Shortlist

| Priority | Firm | Rationale |
|---|---|---|
| Primary | **Spearbit** | ERC-4626 depth, Base ecosystem familiarity, structured re-audit SLA |
| Backup A | **Trail of Bits** | Strong static analysis (Slither, Echidna) |
| Backup B | **OpenZeppelin Security** | OZ primitive authorship — direct ERC-4626 / Pausable knowledge |

---

## Budget & Timeline

| Line item | Estimate |
|---|---|
| Primary audit (small surface, ~280 LOC custom) | $60,000 – $120,000 |
| Remediation window | 2 weeks post-report |
| Re-audit (fixes only) | Included |
| Total ceiling | $120,000 |

> The custom attack surface is small (3 contracts, ~280 lines of bespoke logic on OZ v5.6.1).
> A clean, reconciled pack should keep this at the low end of the range.

### Milestone Table (re-baselined 2026-05-29)

| Date | Milestone |
|---|---|
| 2026-05-29 | Pack reconciled + frozen at SHA `898991c` |
| 2026-06-01 | NDA + scope agreement signed |
| 2026-06-08 | Kick-off call, access provisioned |
| 2026-06-09 | Audit start (Week 1) |
| 2026-07-07 | Preliminary findings delivered |
| 2026-07-14 | Remediation complete (team) |
| 2026-07-21 | Re-audit complete |
| 2026-07-24 | Final report published |
| 2026-07-25 | Mainnet deploy gate reviewed (pending Spearbit sign-off + ADR-006 remediation) |

---

## Codebase Freeze

Audited **contract sources** are pinned at:

```
898991c6ee3c3bfe7637509ecee7ac579dc79388
```

No changes to `contracts/src/` will be merged between freeze and re-audit completion without
explicit auditor notification and scope re-confirmation. Documentation-only commits may land
above this SHA; they never alter contract bytecode.

**Frozen dependency:** OpenZeppelin Contracts **v5.6.1** at submodule commit
`5fd1781b1454fd1ef8e722282f86f9293cacf256` (`contracts/lib/openzeppelin-contracts`).

---

## Pack Contents

| File | Purpose |
|---|---|
| `README.md` | This file — overview, firms, budget, timeline, freeze |
| `scope.md` | Exact in-scope / out-of-scope boundaries (reconciled) |
| `architecture.md` | Ownership diagram, asset-flow diagram, guardian/owner/timelock model, frozen OZ deps |
| `asset-lifecycle.md` | RR-SC-07 — definitive lifecycle of 1 USDC (funds/data/governance flows, Model B ruling, decisions) |
| `invariants.md` | Business + safety invariants the auditor should verify |
| `threat-model.md` | Trust model, asset flows, attack surfaces, mitigations (reconciled) |
| `previous-findings.md` | Pre-audit self-review (reconciled to the real code) |
| `abi-freeze.json` | Compiled ABIs of the three contracts at the freeze SHA |
