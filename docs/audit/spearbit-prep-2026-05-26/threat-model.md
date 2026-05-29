# Threat Model — Hearst Yield Vault

**Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`

Reconciled to the actual code. See `architecture.md` for the ownership and asset-flow
diagrams and `invariants.md` for the invariants. Every actor/function below exists in
`contracts/src/`.

---

## 1. Trust Assumptions

| Actor | Trust level | Notes |
|---|---|---|
| **Safe 3/5** (owner-via-Timelock + publisher) | **Trusted** — honest-majority (≥3 of 5). | Proposes/executes all owner ops behind the 48h Timelock; immutable `publisher` of EventLogger/PoRRegistry. |
| **TimelockController** (48h) | **Trusted by construction** — self-administered (`admin=0`). | Enforces a 48h delay on every owner op (`setMinDeposit`, `setGuardian`, `transferOwnership`). |
| **Guardian** (pause key) | **Semi-trusted** — can pause/unpause only. | Fast-response key, distinct from owner. Can grief availability; **cannot** move funds or change params. Recommended: a 2/3 ops Safe. |
| **Hearst manager** (off-chain) | **Trusted** for capital deployment & yield reflection. | Moves USDC to/from the mining counterparty off-chain (Fireblocks/SPV); reflects yield by transferring USDC into the vault. No on-chain manager-withdraw exists. |
| **Fireblocks** (custody) | **Trusted**, read-only from code (Viewer key). No code→Fireblocks write path. | Off-chain; out of scope. |
| **Mining counterparty** | **Semi-trusted** — governed by the Cayman SPV agreement, not enforced on-chain. | |
| **Investors** | **Untrusted.** KYC gated off-chain (Persona); `minDeposit` is an indicative on-chain floor. | Can deposit (≥ minDeposit) and redeem their own shares when not paused. |
| **USDC token** | **Trusted to be standard** — non-rebasing, non-callback ERC-20. | The no-`ReentrancyGuard` posture relies on this (§3.1). |

---

## 2. Asset Flows

See `architecture.md §3` for the full diagram. Summary:

- **In:** investor `approve` + `deposit` (≥ `minDeposit`, `whenNotPaused`) → shares minted.
- **Yield:** manager transfers USDC into the vault → `totalAssets` ↑ → share value ↑.
- **Out:** investor `withdraw`/`redeem` (`whenNotPaused`). No on-chain lock-up.
- **PoR (advisory):** Safe publishes period attestations to `PoRRegistry` and an audit-trail
  entry to `EventLogger`. Never read by share math.

---

## 3. Attack Surfaces

### 3.1 Reentrancy
**Vector:** `withdraw`/`redeem` transfer USDC out; `deposit`/`mint` pull USDC in.
**Reality / mitigation:** the vault adds **no custom external calls** — only the standard OZ
ERC-4626 `SafeERC20` transfers, in CEI order, on a non-callback ERC-20 (USDC). **There is no
`ReentrancyGuard` and none of `subscribe/distribute/rebalance` exists** (the earlier draft was
wrong). 
**Auditor focus:** confirm there is no re-entry path through the standard OZ flows for a
well-behaved USDC, and advise whether an explicit `nonReentrant` should be added defensively
given the off-chain-yield model (manager-initiated `transfer` into the vault is not a hook).

### 3.2 Share Inflation / Donation (ERC-4626 first-depositor)
**Vector:** first depositor mints dust, donates USDC directly, inflates share price.
**Mitigation:** OZ virtual-shares defence via `_decimalsOffset()=12` (18-dec shares over a
6-dec asset). `previewDeposit`/`convertToShares` stay well-behaved on a fresh vault.
**Auditor focus:** confirm the offset is adequate for USDC; confirm `convertToShares(1)` > 0
at zero TVL. (INV-V3.)

### 3.3 Pause / Availability (Guardian)
**Vector:** a compromised or malicious **guardian** pauses the vault, freezing deposits **and**
withdrawals (full freeze by design).
**Mitigation:** guardian can only pause/unpause — no fund access (INV-A5). Owner (Safe via
48h Timelock) can rotate the guardian (`setGuardian`). Guardian recommended to be a 2/3 Safe.
**Auditor focus:** confirm pause cannot be used to extract value (only to halt); confirm
`unpause` and guardian rotation paths; assess the UX/solvency trade-off of freezing exits
during pause.

### 3.4 Owner Key Compromise
**Vector:** attacker controls the owner and calls `setMinDeposit`/`setGuardian`/`transferOwnership`.
**Mitigation:** owner = Timelock (48h) ← Safe 3/5; a single EOA is insufficient, and every
owner op is delayed 48h (cancellable by the Safe via `CANCELLER_ROLE`). Owner holds **no fund
movement power** and the vault is **non-upgradeable**.
**Auditor focus:** confirm `onlyOwner` functions are limited to the two setters + Ownable
transfer; confirm no upgrade/initializer/selfdestruct backdoor; confirm the 48h applies once
ownership is the Timelock.

### 3.5 PoR / Journal Integrity (Publisher Key)
**Vector:** compromised `publisher` publishes a false attestation or spurious event.
**Reality / mitigation:** EventLogger/PoRRegistry are **append-only** with a single immutable
`publisher`; **no roles, no `updateBalance`, no `ORACLE_UPDATER_ROLE`** (the earlier draft was
wrong). A bad attestation is a **data-integrity** issue only: it moves no funds and cannot be
overwritten (one attestation per period; history is permanent). PoR is **advisory** — not read
by share math (INV-P4).
**Auditor focus:** confirm there is no path from PoR/journal data into vault arithmetic;
confirm one-shot-per-period (`PeriodAlreadyAttested`) and monotonic ids.

### 3.6 Capital-Deployment Gap (off-chain)
**Vector:** ambiguity in how subscribed USDC reaches the mining counterparty, since the vault
has **no manager-withdraw function**.
**Mitigation/assumption:** capital deployment is off-chain (Fireblocks/SPV). The on-chain vault
holds investor USDC; the manager reflects yield by transferring USDC in. **RESOLVED (RR-SC-07)
— see `asset-lifecycle.md`:** implemented model is Model B (cash reserve + injected yield); the
vault has no manager egress, so this is an explicit off-chain trust assumption, not an on-chain
mechanism. Closure requires counsel to align the PPM/LPA to the reserve model.

### 3.7 Cross-Chain / Signature Replay
**Vector:** replaying a signature from Base Sepolia (84532) on Base mainnet (8453).
**Reality:** the **vault has no signatures, no `permit`, no EIP-712 surface** (the earlier
draft was wrong). The only EIP-712 is the **off-chain** Safe/Timelock operation hashing in
`src/lib/governance/eip712.ts`, which binds `chainId`/`verifyingContract` and is matched to
the on-chain `TimelockController.hashOperation` via the pinned parity vector (`architecture.md
§5`). 
**Auditor focus:** confirm the vault truly exposes no signature-accepting entry point; sanity-
check the off-chain hashing parity if reviewing governance config.

### 3.8 Governance Misconfiguration (Timelock/Safe)
**Vector:** Timelock deployed with wrong delay, an EOA retaining admin, or executors set to an
open address.
**Mitigation:** `DeployGovernance.s.sol` sets `minDelay=48h`, proposers=executors=[Safe],
`admin=address(0)`; `Governance.t.sol` asserts all of this (INV-G1/G2).
**Auditor focus:** review the *deployed* Timelock on Base Sepolia matches the script/tests;
confirm no leftover admin and that `transferOwnership(vault → timelock)` actually executed.

---

## 4. Mitigations Summary

| Attack | Primary mitigation | Secondary |
|---|---|---|
| Reentrancy | No custom external calls; OZ CEI + SafeERC20; non-callback USDC | Auditor to advise on defensive `nonReentrant` |
| Share inflation/donation | `_decimalsOffset()=12` virtual shares | Indicative `minDeposit` |
| Pause/availability | Guardian = pause-only, no fund power | Owner rotates guardian via 48h Timelock |
| Owner compromise | Owner = Timelock(48h) ← Safe 3/5; non-upgradeable | Owner has no fund-movement power |
| PoR/journal integrity | Append-only, immutable single publisher, advisory-only | Event audit trail; one attestation/period |
| Capital-deployment gap | Off-chain custody (Fireblocks/SPV) | Documented OPEN ITEM for the arch call |
| Signature replay | Vault has no signature surface at all | Off-chain Timelock hashing binds chainId |
| Governance misconfig | Deploy script + 13 governance tests | Post-deploy on-chain verification (runbook) |

---

## 5. Removed claims (were in the first draft, do NOT exist in code)

For the auditor's benefit, the following were asserted in the `8ba18c99` draft and have been
**removed because they have no counterpart in `contracts/src/`**: `subscribe()`, `distribute()`,
`rebalance()`, `pauseVault()`, `ReentrancyGuard`/`nonReentrant`, `PoRRegistry.updateBalance()`,
`ORACLE_UPDATER_ROLE`, `DEFAULT_ADMIN_ROLE` on PoR, and any vault `permit`/EIP-712/domain-
separator. A grep at the freeze SHA confirms zero occurrences of these in `contracts/src/`.
