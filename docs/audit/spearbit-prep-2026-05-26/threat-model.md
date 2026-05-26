# Threat Model — Hearst Yield Vault

**Freeze SHA:** `8ba18c99a5b1ebce225ca3dbce7d4c9372a4be24`

---

## 1. Trust Assumptions

| Actor | Trust level | Notes |
|---|---|---|
| Admin Safe (M-of-N multisig) | **Trusted** — assumed honest-majority. Safe threshold to be confirmed at deploy (recommended 3-of-5). | Sole authorised caller for `distribute()`, `rebalance()`, `pauseVault()`. |
| Hearst Engineering team | **Trusted** for deployment; key management is out of scope here. | Deploy scripts reviewed but not in audit scope. |
| Privy (auth provider) | **Trusted** for JWT issuance. | JWT verification in `src/proxy.ts` is in-scope. |
| Fireblocks (custody) | **Trusted** — Viewer read-only key in codebase; no write path from code to Fireblocks. | Off-chain custody, not in-scope. |
| Mining counterparty | **Semi-trusted** — governed by legal SPV agreement, not enforced on-chain at MVP. | Phase 4 consideration. |
| Investors | **Untrusted** — minimum `$250k` enforced by `minDeposit` check on-chain. KYC gated off-chain (Persona). | |
| LLM (Kimi K2.6) | **Untrusted** — treated as an arbitrary string generator. All outputs schema-validated before use. | |
| Inngest workers | **Trusted with HMAC verification** — webhook receiver validates `INNGEST_SIGNING_KEY` signature before executing any job. | |

---

## 2. Asset Flows

```
Investor USDC
    │
    ▼ subscribe() — KYC gate off-chain (Persona), min $250k enforced on-chain
HearstYieldVault (ERC-4626)
    │   shares minted to investor
    │
    ▼ Admin Safe transfers USDC to mining counterparty (off-chain settlement)
Mining Operations
    │   monthly yield generated
    │
    ▼ Admin Safe calls distribute() — USDC transferred back to vault
HearstYieldVault
    │   distribution per share recorded
    │
    ▼ Investor calls redeem() after 60-day soft lock-up
Investor USDC (principal + yield)
```

**PoR Oracle flow:**

```
Fireblocks (off-chain) → attestation → PoRRegistry.updateBalance()
                                         │
                                         ▼ EventLogger.log() (audit trail)
```

---

## 3. Attack Surfaces

### 3.1 Reentrancy

**Vector:** `redeem()` / `withdraw()` on the ERC-4626 vault calls an external USDC transfer before state is cleared.

**Mitigation in place:** OpenZeppelin `ReentrancyGuard` (`nonReentrant` modifier on all state-changing vault functions). CEI (Checks-Effects-Interactions) pattern enforced in `HearstYieldVault.sol`.

**Auditor focus:** Confirm `nonReentrant` is applied to `subscribe`, `redeem`, `withdraw`, and `distribute`. Verify no re-entry path through ERC-20 callbacks (USDC is non-rebasing but confirm hook absence).

---

### 3.2 Share Inflation / Donation Attack (ERC-4626)

**Vector:** First depositor mints 1 wei of shares, then donates large USDC directly to vault address, inflating share price and causing subsequent depositors to receive 0 shares (rounding to zero).

**Mitigation in place:** `_decimalsOffset = 12` virtual-shares defence (OZ ERC4626 v5 pattern) — internal virtual assets make the donation economically infeasible. Minimum deposit of $250k further limits the surface.

**Auditor focus:** Confirm `_decimalsOffset` value is appropriate for USDC (6 decimals). Confirm `previewDeposit(1)` returns > 0 after a fresh vault deploy with zero TVL.

---

### 3.3 Oracle Manipulation (PoRRegistry)

**Vector:** Compromised oracle key calls `PoRRegistry.updateBalance()` with falsified reserve values, allowing over-issuance of shares or blocking redemptions.

**Mitigation in place:** Oracle updater role is a separate key from Admin Safe; updateBalance emits an event logged in `EventLogger`; off-chain monitoring alerts on anomalous PoR jumps (>20% in one block).

**Auditor focus:** Confirm oracle role is not `DEFAULT_ADMIN_ROLE`. Confirm there is no path from `updateBalance` to vault share arithmetic at MVP (PoR is advisory in V1, not used in `convertToShares`).

---

### 3.4 Signature Replay (EIP-712 / chainId Binding)

**Vector:** A permit or governance signature crafted on Base Sepolia (chainId 84532) replayed on Base Mainnet (chainId 8453).

**Mitigation in place:** EIP-712 domain separator includes `chainId` bound at construction time (ADR-009). Permit functions use OpenZeppelin `EIP712` base with `block.chainid` at deploy.

**Auditor focus:** Confirm `_domainSeparatorV4()` is not cached across chain forks. Confirm no permit function accepts an externally supplied `chainId` parameter.

---

### 3.5 Admin Session Theft

**Vector:** Attacker compromises an admin wallet (EOA) and calls `distribute()`, `rebalance()`, or `pauseVault()` to drain or freeze vault funds.

**Mitigation in place:** All privileged vault functions require caller to be the Admin Safe address (M-of-N multisig). Single EOA compromise is insufficient. Safe transaction requires M confirmations before execution.

**Auditor focus:** Confirm `onlyOwner` or equivalent is scoped to the Safe address, not an EOA deployer. Confirm no upgradeability backdoor (vault should be non-upgradeable at MVP, or use transparent proxy with Safe as admin).

---

### 3.6 Inngest Spoofing

**Vector:** Attacker sends a forged POST to `/api/inngest` mimicking a legitimate job event, triggering a distribution or rebalance outside the scheduled cron.

**Mitigation in place:** Inngest SDK verifies `INNGEST_SIGNING_KEY` HMAC on every inbound webhook before the handler body executes. Handler rejects unverified requests with 401.

**Auditor focus:** Confirm the HMAC check is in the middleware layer and cannot be bypassed by a crafted `x-inngest-env` header. Confirm `INNGEST_SIGNING_KEY` is not logged or exposed in error responses.

---

### 3.7 Scenario Engine Side-Channel

**Vector:** An adversary supplies crafted scenario parameters that cause the pure-function engine to take exponentially long (DoS via computation), or to leak internal state through timing.

**Mitigation in place:** Engine runs server-side (Server Component / Server Action); user input is schema-validated (Zod) before being passed to engine. Monte Carlo iteration count is capped server-side.

**Auditor focus:** Confirm no user-supplied value can control loop bounds without server-side capping. Confirm engine cannot import `process.env` (which would make it non-pure and potentially expose secrets).

---

### 3.8 LLM Prompt Injection

**Vector:** An investor supplies a malicious description in a scenario or memo field; the text is injected into an LLM prompt, causing the agent to emit forbidden claims ("no risk", "100% return") that bypass the forbidden-word linter.

**Mitigation in place:** User-supplied strings are sanitised (stripped of prompt-delimiter characters) before template injection. Forbidden-word linter runs on the raw LLM output string before schema validation. If the linter triggers, the response is rejected and a safe fallback is returned.

**Auditor focus:** Review the sanitiser in `src/lib/agents/` for completeness (unicode homoglyphs, zero-width characters). Confirm the forbidden-word check cannot be bypassed by splitting words across tokens.

---

## 4. Mitigations Summary Table

| Attack | Primary mitigation | Secondary mitigation |
|---|---|---|
| Reentrancy | OZ ReentrancyGuard + CEI | Audit trail via EventLogger |
| Share inflation/donation | `_decimalsOffset=12` virtual shares | $250k minimum deposit |
| Oracle manipulation | Separate oracle role key | Off-chain anomaly monitoring |
| Signature replay | EIP-712 chainId binding at construction | No external chainId param |
| Admin session theft | M-of-N Safe multisig | Non-upgradeable vault (MVP) |
| Inngest spoofing | HMAC signing key verification | 401 on failure, no partial execution |
| Engine side-channel | Input schema validation (Zod) | Server-side iteration cap |
| LLM prompt injection | Input sanitisation + forbidden-word linter | Safe fallback on linter trigger |
