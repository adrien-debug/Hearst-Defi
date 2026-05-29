# Invariants — Hearst Yield Vault

**Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`

Invariants the auditor should hold the code to. Each maps to existing code; most are already
exercised by `contracts/test/` (73 tests total, all green at the freeze SHA).

---

## 1. Vault accounting (`HearstYieldVault`)

| ID | Invariant | Backed by |
|---|---|---|
| INV-V1 | Share/asset round-trip never creates value: `convertToAssets(convertToShares(x)) <= x` (rounding favours the vault). | `testFuzz_convertRoundTrip` |
| INV-V2 | A lone depositor can never redeem more than deposited (no free value, no donation profit). | `testFuzz_depositRedeem_neverYieldsMoreThanDeposited` |
| INV-V3 | Empty-vault inflation/donation is economically defeated by virtual shares (`_decimalsOffset()==12`); `convertToShares(1 USDC) == 1e12` at genesis. | `test_genesisConversion_*`, PoR §3.1 |
| INV-V4 | `deposit`/`mint` revert when asset inflow `< minDeposit` (single chokepoint `_deposit`). | `test_deposit_revertsBelowMinimum`, `test_mint_alsoEnforcesMinimum` |
| INV-V5 | When `paused()`, **all** entry (`deposit`/`mint`) **and** exit (`withdraw`/`redeem`) revert with `EnforcedPause` (chokepoints `_deposit` + `_withdraw`). | `test_pause_blocks{Deposit,Mint,Withdraw,Redeem}` |
| INV-V6 | `unpause()` fully restores entry and exit. | `test_unpause_restoresEntryAndExit` |
| INV-V7 | Yield is reflected only by USDC actually held: `totalAssets()` equals the vault's USDC balance; share value rises only when USDC is transferred in. | `test_offChainYield_increasesShareValue` |

## 2. Access control

| ID | Invariant | Backed by |
|---|---|---|
| INV-A1 | Only `owner` can `setMinDeposit` / `setGuardian`; non-owner reverts `OwnableUnauthorizedAccount`. | `test_setMinDeposit_revertsForNonOwner`, `test_setGuardian_revertsForNonOwner` |
| INV-A2 | Only `guardian` can `pause`/`unpause`; **owner cannot pause** (reverts `NotGuardian`). | `test_pause_revertsForOwner`, `test_pause_revertsForStranger`, `testFuzz_pause_onlyGuardian` |
| INV-A3 | `guardian` is non-zero at construction and after rotation; `setGuardian(0)` reverts `ZeroAddress`. | `test_constructor_revertsOnZeroGuardian`, `test_setGuardian_revertsOnZero` |
| INV-A4 | `owner != guardian` is enforced at deploy (`DeployHearstYieldVault.s.sol` `require`), so the timelocked owner is never also the fast pause key. | deploy script `require(guardian != owner)` |
| INV-A5 | Guardian holds **no** power beyond pause/unpause (cannot move funds, change params, or rotate itself). | contract surface (no other guarded fn) |

## 3. Append-only journals

| ID | Invariant | Backed by |
|---|---|---|
| INV-P1 | `EventLogger`/`PoRRegistry` `publisher` is immutable; only `publisher` can write; non-publisher reverts. | `EventLogger.t.sol`, `PoRRegistry.t.sol` |
| INV-P2 | `PoRRegistry.publish` is one-shot per `YYYYMM`: a second `publish` for the same period reverts `PeriodAlreadyAttested`; ids are monotonic. | `PoRRegistry.t.sol` |
| INV-P3 | Neither journal can move funds, delete, or overwrite history (append-only). | contract surface (no transfer/setter) |
| INV-P4 | PoR data is **advisory**: no value from `PoRRegistry` feeds `convertToShares`/`convertToAssets`. | vault has no PoR import |

## 4. Governance (TimelockController config)

| ID | Invariant | Backed by |
|---|---|---|
| INV-G1 | `minDelay == 172800` (48h). | `test_minDelay_is48Hours` |
| INV-G2 | Safe holds PROPOSER/EXECUTOR/CANCELLER; `address(0)` and deployer do **not** hold `DEFAULT_ADMIN_ROLE`; timelock self-administers. | `test_*Role`, `test_*lacksAdminRole`, `test_timelockItself_holdsAdminRole` |
| INV-G3 | Off-chain `timelockOperationId` matches on-chain `hashOperation` for the pinned parity vector. | `test_hashOperation_parityVector` |

---

## 5. Trust assumptions (must hold for the model to be sound)

1. **Safe 3/5** owners are honest-majority; ≥3 keys are not simultaneously compromised.
2. **Guardian key** is available for fast incident response and is not the same entity as the
   timelocked owner. A malicious guardian can grief availability (pause) but cannot steal.
3. **`minDeposit` and the 60-day soft lock-up are OFF-CHAIN controls** (KYC/Persona + Cayman
   LPA). On-chain `minDeposit` is indicative and owner-mutable; there is no on-chain lock-up.
4. **Capital deployment to mining is off-chain** (Fireblocks / SPV). The contracts do not move
   USDC to a counterparty; there is no manager-withdraw function (see `architecture.md` OPEN
   ITEM). The vault holds investor USDC; the manager raises NAV by transferring USDC back in.
5. **PoR attestations are advisory** and signed off-chain; a compromised `publisher` could
   publish a false attestation (data-integrity issue, append-only, no fund movement) but
   cannot affect share math.
6. **USDC** is a standard non-rebasing, non-callback ERC-20 (no transfer hooks). The vault
   relies on this (no `ReentrancyGuard` is present — see threat model §3.1).
