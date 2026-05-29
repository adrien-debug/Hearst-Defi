# Previous Findings — Hearst Yield Vault

**Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`

---

## Prior audit history

No prior external audits. This is the first formal third-party review.

## Reconciliation (2026-05-29)

The first draft (`8ba18c99`) listed PRE-01…PRE-09 as "remediated." On review, **four of them
described functions/roles that never existed in the code** (`subscribe()`, a `ReentrancyGuard`,
`ORACLE_UPDATER_ROLE`/`updateBalance()`, a vault `permit`/EIP-712). Rather than claim a fix to
phantom code, those are **withdrawn and restated against the real contracts** below. The
genuinely-real items are kept. In-contract-scope items are marked **[CONTRACT]**; off-chain
items are marked **[OFF-CHAIN — out of this audit's scope]** for context only.

---

### PRE-01 — Reentrancy posture on the vault  **[CONTRACT]**
**Original claim (WITHDRAWN):** "added `nonReentrant` to `subscribe()`/`redeem()`/`withdraw()`/`distribute()`."
**Reality:** there is no `subscribe`/`distribute`, and **no `ReentrancyGuard` in the code**. The
vault exposes only standard OZ ERC-4626 `deposit`/`mint`/`withdraw`/`redeem`, which use
`SafeERC20` transfers in CEI order with no custom external call and no token callback (USDC).
**Status:** Restated as a design posture (no guard, no custom reentrant surface). **Open for
auditor judgement:** advise whether to add a defensive `nonReentrant`. See threat-model §3.1.

### PRE-02 — ERC-4626 first-depositor share inflation  **[CONTRACT]**
**Severity:** High · **Status:** Mitigated (real).
**Detail:** standard donation/inflation vector. Mitigated by OZ virtual shares,
`_decimalsOffset()=12` in `HearstYieldVault.sol`. Indicative `minDeposit` adds an economic
barrier. Covered by `test_genesisConversion_*` and the convert fuzz tests. (INV-V3.)

### PRE-03 — PoRRegistry oracle/admin roles  **[CONTRACT]**
**Original claim (WITHDRAWN):** "introduced a separate `ORACLE_UPDATER_ROLE`; admin no longer
holds it; `updateBalance()` guarded."
**Reality:** `PoRRegistry.sol` has **no AccessControl, no roles, no `updateBalance`**. It has a
single immutable `publisher` and an append-only `publish()` (one attestation per `YYYYMM`).
There is no admin role to separate.
**Status:** Restated — PoR is append-only and advisory; publisher-key compromise is a
data-integrity concern only (threat-model §3.5, INV-P1…P4).

### PRE-04 — EIP-712 domain separator / replay on the vault  **[CONTRACT]**
**Original claim (WITHDRAWN):** "vault uses OZ `EIP712`, `_domainSeparatorV4()`, permit with
chainId binding."
**Reality:** the **vault has no EIP-712, no `permit`, no domain separator, no signature entry
point at all.** The only EIP-712 in the system is **off-chain** (Safe/Timelock operation
hashing in `src/lib/governance/eip712.ts`), matched to on-chain `TimelockController.hashOperation`
via the pinned parity vector (architecture.md §5).
**Status:** Restated — no on-chain replay surface on the vault (threat-model §3.7).

### PRE-05 — Engine purity (`Date.now()` leak)  **[OFF-CHAIN — out of scope]**
**Status:** Mitigated (real). `Date.now()` removed from `src/lib/engine/`; timestamps injected
by the caller. Engine purity is not part of this contract audit but is noted for context.

### PRE-06 — Inngest webhook HMAC verification  **[OFF-CHAIN — out of scope]**
**Status:** Mitigated (real). `/api/inngest/route.ts` uses the Inngest `serve()` wrapper;
inbound webhooks are HMAC-verified. Off-chain; context only.

### PRE-07 — LLM agent output schema validation before DB write  **[OFF-CHAIN — out of scope]**
**Status:** Mitigated (real). All four agents validate output through Zod before any DB write.
Off-chain; context only.

### PRE-08 — On-chain minimum deposit  **[CONTRACT]**
**Original claim (PARTIALLY WRONG):** "added `require(assets >= MIN_DEPOSIT)` with
`MIN_DEPOSIT = 250_000e6` hardcoded in `subscribe()`."
**Reality:** there is no `subscribe()`. The floor lives in the `_deposit` chokepoint
(`if (assets < minDeposit) revert DepositBelowMinimum(...)`), but `minDeposit` is an
**owner-configurable, indicative value** (it can be set to 0 via `setMinDeposit`), **not** a
hardcoded `250_000e6`. The real $250k min-ticket and the 60-day lock-up are **off-chain
controls** (KYC + Cayman LPA).
**Status:** Restated — on-chain `minDeposit` is a UX guardrail, not a compliance control
(INV-V4, trust assumption §3 in invariants.md). Set the deployed value deliberately at deploy.

### PRE-09 — Forbidden-word linter unicode bypass  **[OFF-CHAIN — out of scope]**
**Severity:** Low · **Status:** Partially remediated — still open.
**Detail:** the agent forbidden-word linter normalises NFKC and strips zero-width characters,
but a comprehensive homoglyph map is incomplete. Off-chain (LLM agents), not part of this
contract audit, but flagged for transparency.

---

## New self-identified items (from the real code)

### PRE-10 — Guardian/owner separation  **[CONTRACT]** — by design
The guardian (pause/unpause) is deliberately distinct from the timelocked owner, enforced at
deploy by `require(guardian != owner)`. A malicious guardian can grief availability (pause)
but cannot move funds or change parameters. Auditors should confirm the bound impact.

### PRE-11 — No on-chain manager-withdraw path  **[CONTRACT]** — open architecture item
The vault has no owner/manager function to move USDC out. Capital deployment to mining is
off-chain (Fireblocks/SPV). Auditors should record this as an explicit off-chain assumption;
product to confirm the intended capital-deployment mechanism (architecture.md OPEN ITEM).

---

## Notes for auditors

- **In-contract-scope, real and mitigated:** PRE-02. **Restated as design/open:** PRE-01,
  PRE-08, PRE-10, PRE-11. **Restated as N/A (phantom in old draft):** PRE-03, PRE-04.
- Off-chain context only: PRE-05, PRE-06, PRE-07, PRE-09.
- Supporting tests: `contracts/test/{HearstYieldVault,PoRRegistry,EventLogger,Governance}.t.sol`
  (73 tests, green at the freeze SHA). Duplicate findings welcome if any stated property breaks.
