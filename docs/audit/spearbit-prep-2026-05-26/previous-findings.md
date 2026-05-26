# Previous Findings — Hearst Yield Vault

**Freeze SHA:** `8ba18c99a5b1ebce225ca3dbce7d4c9372a4be24`

---

## Prior Audit History

No prior external audits have been conducted on this codebase. This is the first formal third-party security review.

---

## Pre-Audit Self-Identified Findings (PRE-01 to PRE-09)

The engineering team conducted an internal security review prior to submitting for formal audit. The following findings were identified and remediated in-house. Auditors may treat these as closed but are encouraged to verify the fixes.

---

### PRE-01 — Missing `nonReentrant` on `subscribe()`

**Severity:** High  
**Status:** Remediated  
**File:** `contracts/src/HearstYieldVault.sol`  
**Description:** Initial implementation of `subscribe()` lacked the `nonReentrant` modifier. An attacker with a malicious ERC-20 receive hook could re-enter before share minting completed.  
**Fix:** Added `nonReentrant` from OZ `ReentrancyGuard`. CEI order verified.

---

### PRE-02 — ERC-4626 First-Depositor Share Inflation

**Severity:** High  
**Status:** Remediated  
**File:** `contracts/src/HearstYieldVault.sol`  
**Description:** Standard ERC-4626 vulnerability: a first depositor minting 1 wei of shares then donating USDC directly to the vault contract inflates the share price, causing subsequent depositors to receive 0 shares.  
**Fix:** Applied OZ ERC4626 v5 `_decimalsOffset = 12` virtual-shares pattern. Minimum deposit of $250k enforced at the API layer as an additional economic barrier.

---

### PRE-03 — Oracle Role Not Separated from Admin

**Severity:** Medium  
**Status:** Remediated  
**File:** `contracts/src/PoRRegistry.sol`  
**Description:** Early version assigned `DEFAULT_ADMIN_ROLE` as the oracle updater role, meaning a compromised admin could silently update PoR balances without multisig co-sign.  
**Fix:** Introduced a separate `ORACLE_UPDATER_ROLE`. Admin Safe does not hold this role by default.

---

### PRE-04 — EIP-712 Domain Separator Cached Across Fork

**Severity:** Medium  
**Status:** Remediated  
**File:** `contracts/src/HearstYieldVault.sol`  
**Description:** An earlier version cached `_domainSeparator` as an immutable at construction. A chain fork would silently reuse the same separator, enabling cross-chain signature replay.  
**Fix:** Adopted OZ `EIP712` base which recomputes `_domainSeparatorV4()` dynamically when `block.chainid` differs from the cached value at construction (EIP-2612 pattern).

---

### PRE-05 — Engine Leaked `Date.now()` Into Scenario Output

**Severity:** Low (engine purity violation, not a financial exploit)  
**Status:** Remediated  
**File:** `src/lib/engine/scenario.ts`  
**Description:** A logging statement inside the engine called `Date.now()`, breaking the pure-function invariant and making snapshot tests non-deterministic.  
**Fix:** Removed `Date.now()` from engine. Timestamps are injected as parameters from the caller layer.

---

### PRE-06 — Inngest Webhook Missing HMAC Verification

**Severity:** High  
**Status:** Remediated  
**File:** `src/app/api/inngest/route.ts`  
**Description:** An early version of the Inngest route handler did not call the SDK's `serve()` helper, which performs HMAC verification. Raw event parsing allowed spoofed job triggers.  
**Fix:** Replaced manual handler with Inngest `serve()` wrapper. All inbound requests are HMAC-verified before handler body executes.

---

### PRE-07 — LLM Agent Output Not Schema-Validated Before DB Write

**Severity:** Medium  
**Status:** Remediated  
**File:** `src/lib/agents/`  
**Description:** Agent responses were written to the database as raw strings. A malformed or adversarially crafted LLM output could inject unexpected values into the `Proof` or `RebalanceEvent` tables.  
**Fix:** All agent outputs are now parsed through a Zod schema before any database write. Parse failures return an error to the caller; no partial data is written.

---

### PRE-08 — Missing Deposit Cap Allowing Sub-Minimum Deposits

**Severity:** Medium  
**Status:** Remediated  
**File:** `contracts/src/HearstYieldVault.sol`  
**Description:** The on-chain `subscribe()` function had no minimum amount check. KYC minimum enforcement existed only in the off-chain API layer, which could be bypassed by calling the contract directly.  
**Fix:** Added `require(assets >= MIN_DEPOSIT, "below minimum")` to `subscribe()`, where `MIN_DEPOSIT` is set to `250_000 * 1e6` (USDC 6 decimals).

---

### PRE-09 — Forbidden-Word Linter Bypassable via Unicode Homoglyphs

**Severity:** Low  
**Status:** Partially remediated — under active review  
**File:** `src/lib/agents/linter.ts`  
**Description:** The forbidden-word linter matched ASCII patterns only. Substituting `'е'` (Cyrillic) for `'e'` in "guarantee" would bypass the check. Zero-width characters between letters also evaded detection.  
**Fix applied:** Added unicode normalisation (`NFKC`) and zero-width character stripping before linter evaluation. Comprehensive homoglyph mapping is still being built out — auditors should scrutinise this module.

---

## Notes for Auditors

- PRE-01 through PRE-08 are considered fully closed by the team. Supporting test cases exist in `contracts/test/` and `src/lib/agents/__tests__/`.
- PRE-09 is partially open. The linter module (`src/lib/agents/linter.ts`) is explicitly in scope for review.
- The team welcomes duplicate findings on any PRE item if the auditor identifies a bypass of the stated fix.
