# Asset Lifecycle — The Journey of 1 USDC in Hearst Yield Vault

**Closes:** RR-SC-07 · **Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`
**Audience:** Spearbit · Counsel (Maples) · Institutional LPs
**Status:** Definitive. Grounded in `contracts/src/HearstYieldVault.sol` (ERC4626 + Ownable +
Pausable, OZ v5.6.1) and the OZ ERC-4626 semantics it inherits unchanged.

---

## Executive Summary

When an LP deposits 1 USDC, that dollar is transferred **into the `HearstYieldVault` contract
and stays there**. It is controlled by exactly one mechanism: the immutable ERC-4626
redemption logic. **No human, no role, no manager, and no owner can move it.** The only way a
dollar leaves the vault is when a share-holder redeems their own shares.

It follows, as a matter of code (not opinion), that:

- The vault is a **cash-custody + share-accounting wrapper**. It holds **USDC only** — never
  Bitcoin, never mining hardware, never a claim token.
- **Mining is represented only in accounting/attestation, never as an on-chain value flow.**
  Deposited capital is **not** deployed to mining on-chain — it physically **cannot** be,
  because the contract exposes no egress to any address other than a redeeming share-holder.
- **Yield is exogenous:** the manager raises NAV by transferring mining-derived USDC *into* the
  vault. NAV updates automatically (`totalAssets = vault USDC balance`). There is no oracle, no
  manual NAV setter, no strategy execution.

**Implemented model = Model B** (cash vault + externally-injected yield). Model A is false;
Model C is not implemented.

**Verdict: the architecture is internally COHERENT and unusually safe for custody (the manager
provably cannot touch LP principal), but it is INCOMPLETE relative to the marketed narrative of
"capital deployed to Bitcoin mining."** On-chain, LP principal is a cash reserve, not deployed
capital. Closing RR-SC-07 is therefore a **product/legal decision**, not a code fix. We take a
position in §Required Decisions and §Final Recommendation: **adopt the reserve model for V1
(zero code), align the PPM/LPA accordingly, and defer any on-chain capital-deployment to a V2
contract that is itself audited.**

---

## Asset Flow (funds)

```
 ┌────┐ 1. approve(vault, 1 USDC)        ┌──────────────────────────────┐
 │ LP │ 2. deposit(1 USDC, LP) ─────────▶│      HearstYieldVault         │
 └────┘    USDC pulled INTO the contract │  holds: 1 USDC (ERC-20)       │
   ▲       shares minted (1e12 @ genesis)│  mints: 1e12 shares to LP     │
   │                                     └───────────────┬──────────────┘
   │                                                     │  the 1 USDC SITS HERE.
   │                                                     │  No function can send it
   │                                                     │  anywhere except ↓ redeem.
   │                                                     │
   │  6. redeem(shares) / withdraw(assets)               │
   │     USDC sent back to the LP only,                  │
   │     pro-rata to shares (whenNotPaused)              │
   └─────────────────────────────────────────────────────┘

 YIELD INJECTION (the only way value enters besides deposits):
   Mining revenue (off-chain, SPV account)
        │  manager sends mining-derived USDC  ──ERC20.transfer──▶  HearstYieldVault
        ▼                                                          totalAssets ↑ ⇒ NAV/share ↑
   (this is a plain transfer to the vault address — NOT a vault function)

 WHAT IS *NOT* IN THIS DIAGRAM (because it does not exist on-chain):
   ✗ Vault → mining partner          (no egress function)
   ✗ Vault → BTC / T-bills / lending (no strategy execution)
   ✗ Manager/Owner → pulls USDC out  (no privileged withdrawal)
```

**Plain-language lifecycle of the dollar:**
1. **Deposit (on-chain).** `deposit()` runs OZ `_deposit`: `safeTransferFrom(LP → vault, 1 USDC)`
   then `_mint(LP, shares)`. The dollar now lives at the vault contract address.
2. **Custody (on-chain).** The dollar is held *by the contract*, governed by ERC-4626 math. The
   custodian is the code, not a person. `totalAssets()` = the vault's USDC balance.
3. **Mining financing (OFF-CHAIN / legal).** The vault does **not** and **cannot** send the
   dollar to a mining partner. If mining is financed, it is financed off-vault under the Cayman
   SPV; the on-chain dollar functions as a **reserve**, not as deployed capital.
4. **Revenue return (on-chain transfer, off-chain decision).** The manager transfers
   mining-derived USDC into the vault. This is an ordinary ERC-20 transfer to the vault address.
5. **NAV update (on-chain, automatic).** NAV/share = `totalAssets / totalSupply`. The instant
   USDC arrives, every share is worth more. No setter, no oracle, no rounding games beyond the
   virtual-share offset (`_decimalsOffset()=12`).
6. **Redemption (on-chain).** `redeem()`/`withdraw()` burns shares and sends pro-rata USDC to
   the LP. Because **all** USDC (principal + injected yield) is in the contract, redemptions are
   always principal-solvent. The 60-day soft lock-up is **off-chain only** (no on-chain lock).

---

## Data Flow (attestations / provenance — advisory, no value)

```
Fireblocks balances (off-chain, Viewer read-only)
      │  signed monthly attestation (EIP-191), AUM + mined BTC sats
      ▼
Safe 3/5 (publisher) ──▶ PoRRegistry.publish(period, totalAumUsd, minedBtcSats,
      │                                        evidenceHash, evidenceCid)   [append-only, 1×/period]
      └────────────────▶ EventLogger.logEvent(AttestationPublished, contextHash, cid)  [audit trail]

KEY PROPERTY: this data NEVER feeds share math. `convertToShares` / `convertToAssets` read
ONLY `totalAssets` (the vault's USDC balance). PoR is provenance/reporting, not collateral.
```

So there are **two disjoint planes**:
- **Value plane (on-chain, authoritative):** USDC in the vault ⇄ shares. Self-contained.
- **Evidence plane (on-chain, advisory):** PoR/Event attestations describing off-chain reality.
  A false attestation is a reporting-integrity issue; it cannot mint/burn shares or move funds.

---

## Governance Flow

```
Param/ownership change (setMinDeposit, setGuardian, transferOwnership):
   Safe 3/5  ──propose──▶  TimelockController (48h)  ──execute (after 48h)──▶  Vault.<ownerFn>

Emergency halt (deposits AND withdrawals frozen):
   Guardian (separate fast key / 2-of-3 Safe)  ──pause()/unpause()──▶  Vault

Attestation publishing:
   Safe 3/5 (immutable publisher)  ──▶  PoRRegistry.publish / EventLogger.logEvent

What governance CANNOT do (by construction): move, withdraw, sweep, or redirect vault USDC.
There is no privileged path to LP funds. Worst-case fully-compromised owner+guardian can only
(a) block new deposits (minDeposit), (b) rotate the guardian, (c) pause/halt. Never extract.
```

---

## Responsibility Matrix

| Step | On/Off-chain | Technical actor | Human actor | Legal actor |
|---|---|---|---|---|
| 1. Deposit | **On-chain** | `HearstYieldVault.deposit` (OZ `_deposit`) | LP (signs tx) | LP ↔ SPV subscription agreement |
| 2. Custody of principal | **On-chain** | The vault contract (ERC-4626) | — (no human control) | Vault holds LP USDC under SPV terms |
| 3. KYC / eligibility | **Off-chain** | Persona + app gate | Compliance officer | KYC/AML, Cayman LPA |
| 4. Mining financing | **Off-chain** | — (no on-chain path) | Hearst manager | SPV ↔ mining counterparty contract |
| 5. Revenue return (yield injection) | **On-chain tx, off-chain decision** | `ERC20.transfer` → vault | Hearst manager (via Safe-controlled treasury) | SPV revenue-share entitlement |
| 6. PoR attestation | **On-chain (advisory)** | `PoRRegistry.publish` / `EventLogger` | Safe 3/5 signers | Auditor-verifiable evidence trail |
| 7. NAV update | **On-chain, automatic** | ERC-4626 `totalAssets`/`convert*` | — (deterministic) | — |
| 8. Distribution scheduling | **Off-chain** | Inngest cron + admin | Hearst ops | — |
| 9. Redemption | **On-chain** | `HearstYieldVault.redeem`/`withdraw` | LP (signs tx) | 60-day soft lock-up (LPA, off-chain) |
| 10. Emergency halt | **On-chain** | `pause`/`unpause` | Guardian signers | incident policy |
| 11. Param/ownership change | **On-chain (48h)** | `TimelockController` ← Safe 3/5 | Safe signers | governance policy (ADR-009) |

---

## Architecture Assessment — explicit answers

| Question | Answer | Code basis |
|---|---|---|
| **Which model is implemented?** | **Model B** — cash-custody vault, mining revenue injected periodically as exogenous yield. | Vault holds USDC only; `totalAssets = balanceOf(vault)`; no asset other than USDC; no strategy. |
| **Can the vault send funds?** | **Yes — but only to a redeeming share-holder**, pro-rata to shares, via `withdraw`/`redeem`. Never to an arbitrary address. | OZ `_withdraw` → `safeTransfer(asset, receiver, assets)`; receiver is the redeemer. |
| **Can the vault withdraw funds (to a strategy/manager)?** | **No.** No function moves USDC out except shareholder redemption. | No `sweep`/`deploy`/`transferAssets`; surface = setters + pause + ERC-4626 only. |
| **Can the manager move funds?** | **No.** Owner = `setMinDeposit`/`setGuardian`/`transferOwnership` only; guardian = `pause`/`unpause` only. Neither can touch USDC. The manager can only *add* USDC (as anyone can). | `onlyOwner` / `onlyGuardian` function set; no fund-egress under either. |
| **Is mining represented on-chain or only in accounting?** | **Accounting/attestation only.** No mining asset, claim token, or value flow exists on-chain. PoR is advisory and never enters share math. | `PoRRegistry` is append-only evidence; vault imports nothing from it. |
| **Where is the dollar kept / who controls it?** | In the **vault contract**; controlled by the **immutable ERC-4626 redemption logic** — not by any person or role. | `safeTransferFrom(LP → address(this))` on deposit; egress only via redeem. |
| **How is NAV updated?** | **Automatically**, as `totalAssets / totalSupply`, the moment USDC enters/leaves. No oracle, no manual setter. | OZ `totalAssets() = _asset.balanceOf(this)` + virtual offset. |

### Coherence ruling
- **As code: COHERENT.** Model B is internally consistent, deterministic, and delivers a
  **strong institutional custody property** — the operator provably cannot misappropriate LP
  principal on-chain. For a smart-contract auditor this is a *small, low-risk surface* (a plus).
- **vs. the product narrative: INCOMPLETE / MISALIGNED.** "Mining-backed structured yield with
  30–40% of AUM deployed to mining" is **not** what the chain does. On-chain, 100% of LP
  principal remains as USDC in the vault and is never deployed. The mining relationship lives
  entirely off-chain (SPV + attestations). An institutional auditor or counsel will require the
  documents to state this truthfully before signing.

**Therefore: the architecture is INCOMPLETE** — not because code is missing, but because the
on-chain reality and the marketed/legal description must be reconciled by an explicit decision.

---

## Required Decisions (product + legal — pick one, then this is COMPLETE)

**Decision D-1 — what backs an LP share, and where does principal sit?** Choose:

- **Path 1 — Reserve / yield-injection model (RECOMMENDED, zero code).**
  LP principal **remains as USDC in the vault** as a reserve. Mining is financed off-vault by
  Hearst/SPV capital. The LP receives a **mining-derived USDC yield stream** injected monthly;
  principal is held in a contract the operator cannot touch. Redemptions are always
  principal-solvent. **Risk profile:** LP bears mining risk only via *foregone yield*, not via
  principal-at-mining-risk. **Action:** align PPM/LPA + Spearbit pack to this truth. **No
  contract change.** Fully auditable today.

- **Path 2 — On-chain capital-deployment model (V2, requires a NEW audited contract).**
  To actually deploy LP principal to mining/strategy on-chain, the vault needs a **governed
  egress** (e.g. timelock-gated `deployCapital(amount, whitelistedDestination)`) **and** a
  NAV-inclusion mechanism so shares account for assets that have left the contract (this makes
  the PoR oracle *load-bearing* instead of advisory — a materially larger attack surface). This
  is a **material change**, currently **absent**, and must be in its own audit scope. **Do not
  rush it into the frozen pre-audit codebase.**

---

## Final Recommendation

**Adopt Path 1 (reserve / yield-injection) for V1, and ship it through Spearbit as-is.**

Rationale, decisive:
1. **It is the only model the frozen contracts actually implement.** Documenting Path 1 makes
   the architecture *complete* with **zero code change** — the on-chain reality then matches the
   promise, which is exactly the bar an institutional auditor sets.
2. **It is the safer product.** LP principal is custodied by code the operator cannot move;
   redemptions are always solvent. That is a *stronger* institutional story than "your capital
   funds hardware," provided the PPM says so.
3. **Path 2 is a material risk increase** (privileged egress + oracle-dependent NAV) that should
   never be bolted onto a codebase that is about to be frozen for audit. It belongs to a
   separate, separately-audited V2.

**Minimal change to make an institutional auditor consider the architecture COMPLETE
(documentation only, no code, no contract change):**
1. **PPM/LPA (counsel):** state that LP capital is held as USDC in an ERC-4626 vault as a
   reserve, is **not** deployed on-chain, and that yield is a mining-revenue-share distribution
   injected by the manager; LPs bear mining performance risk through yield, not principal
   deployment.
2. **Spearbit pack (done in this commit):** this `asset-lifecycle.md` is the canonical answer;
   `architecture.md` OPEN ITEM is marked resolved → Model B reserve.
3. **Investor disclosure:** the headline "mining-backed yield" is accurate; add the one-line
   clarification that principal is custodied as cash and yield is mining-derived.

Once counsel ratifies (1), RR-SC-07 is **closed** and the architecture is **complete and
coherent** for Spearbit, counsel, and institutional LPs. If, instead, the business mandates
on-chain deployment, that is **Path 2 = a new V2 audit**, and V1 must not claim on-chain
deployment in the interim.
