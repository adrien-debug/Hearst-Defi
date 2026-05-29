# Architecture — Hearst Yield Vault (audit context)

**Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`

This document describes the *actual* on-chain architecture at the freeze SHA. Every box maps
to a contract or role that exists in `contracts/src/` or is configured at deploy.

---

## 1. Contract topology

```
                         ┌─────────────────────────────┐
                         │      Gnosis Safe 3/5         │  off-chain multisig
                         │  (5 owners, threshold 3)     │  (deployed via Safe UI)
                         └──────────────┬──────────────┘
                                        │ PROPOSER_ROLE + EXECUTOR_ROLE + CANCELLER_ROLE
                                        ▼
                         ┌─────────────────────────────┐
                         │   TimelockController (OZ)    │  minDelay = 48h (172800s)
                         │   admin = address(0)         │  self-administered
                         └──────────────┬──────────────┘
                                        │ owner of  (after transferOwnership)
                                        ▼
   ┌───────────────┐      owner   ┌─────────────────────────────┐
   │  Guardian     │──pause()────▶│      HearstYieldVault        │  ERC4626 + Ownable + Pausable
   │  (fast key /  │──unpause()──▶│  asset = USDC (6 dec)        │  shares = 18 dec (offset 12)
   │   Safe 2/3)   │              │  minDeposit (indicative)     │
   └───────────────┘              └─────────────────────────────┘

   ┌───────────────┐  publisher (immutable, = Safe 3/5)   ┌──────────────────┐
   │  EventLogger  │◀─────────────────────────────────────│   PoRRegistry    │
   │  logEvent()   │      both append-only, no funds       │   publish()      │
   └───────────────┘                                       └──────────────────┘
```

- `HearstYieldVault.owner` → in production = the **TimelockController** (48h). Every
  owner action (`setMinDeposit`, `setGuardian`, `transferOwnership`) is therefore subject to
  a 48h delay and a Safe 3/5 proposal.
- `HearstYieldVault.guardian` → a **separate fast-response key** (recommended: a 2/3 ops
  Safe). It can **only** `pause()` / `unpause()`. Kept distinct from `owner` because an
  emergency cannot wait out a 48h timelock.
- `EventLogger` / `PoRRegistry` `publisher` → immutable, set at construction to the Safe 3/5.
  Append-only journals; they hold no funds and cannot move any.

---

## 2. Ownership / privilege model (authoritative)

| Privilege | Holder (production) | Functions | Cannot |
|---|---|---|---|
| **owner** (vault) | TimelockController ← Safe 3/5 (48h) | `setMinDeposit`, `setGuardian`, `transferOwnership` (OZ `Ownable`) | move funds, pause, upgrade |
| **guardian** (vault) | Separate fast key / Safe 2/3 | `pause`, `unpause` | move funds, change params, rotate itself |
| **timelock** | Self (admin = `address(0)`) | enforces 48h on all owner ops; role changes need a 48h proposal | — |
| **publisher** (EventLogger) | Safe 3/5 (immutable) | `logEvent` | move funds, rewrite/delete history |
| **publisher** (PoRRegistry) | Safe 3/5 (immutable) | `publish` (1×/period) | move funds, overwrite a period, rewrite history |

Properties: vault is **non-upgradeable**; no `DEFAULT_ADMIN_ROLE`-style God role anywhere; no
EOA holds privileged power after `transferOwnership` + guardian wiring; EventLogger/PoRRegistry
have **no roles at all** beyond their single immutable `publisher`.

---

## 3. Asset flow (real)

```
Investor (KYC-cleared off-chain via Persona)
   │  USDC.approve(vault, amount)
   │  vault.deposit(amount, investor)        require amount >= minDeposit; whenNotPaused
   ▼
HearstYieldVault  ── mints shares (genesis: 1 USDC → 1e12 shares; offset 12)
   ▲   │
   │   │  (no on-chain manager-withdraw function exists — see OPEN ITEM below)
   │   │
   │   └─ Manager transfers USDC INTO the vault  ⇒ totalAssets ↑ ⇒ share value ↑  (yield reflection)
   │
   ▼  vault.redeem(shares) / withdraw(assets)   whenNotPaused; no on-chain lock-up
Investor USDC (principal + reflected yield)

Proof-of-Reserves (advisory, off the share-math path):
Fireblocks balances (off-chain) → signed attestation → Safe 3/5 calls
   PoRRegistry.publish(period, aum, sats, evidenceHash, cid)
   Safe 3/5 calls EventLogger.logEvent(AttestationPublished, contextHash, cid)   ← audit trail
```

**OPEN ITEM (flag for auditor & product):** the vault has **no owner/manager function to
withdraw USDC** out of the contract. Capital deployment to the mining counterparty therefore
happens via a mechanism that is **not on-chain in these contracts** (off-chain custody /
Fireblocks, governed by the Cayman SPV agreement). Auditors should treat "how subscribed USDC
reaches the mining operation" as an explicit off-chain trust assumption, not an on-chain flow.
PoR figures are **advisory** — they are never read by `convertToShares`/`convertToAssets`.

---

## 4. Frozen OpenZeppelin dependencies

| Package | Version | Submodule commit | Used by |
|---|---|---|---|
| `@openzeppelin/contracts` | **v5.6.1** | `5fd1781b1454fd1ef8e722282f86f9293cacf256` | ERC4626, ERC20, Ownable, Pausable (vault); TimelockController (governance) |
| `forge-std` | (test only) | vendored under `contracts/lib/forge-std` | tests only — never deployed |

Build: `forge build --root contracts` (solc `0.8.24`, optimizer 200, EVM `cancun`,
`via_ir=false`, `bytecode_hash=none`). Runtime size: `HearstYieldVault` 5,585 B (margin
18,991 B under the 24,576 B limit).

---

## 5. TimelockController parity anchor

Off-chain governance (`src/lib/governance/eip712.ts`) computes operation ids that must match
the on-chain `TimelockController.hashOperation`. Pinned parity vector (see
`contracts/test/Governance.t.sol::test_hashOperation_parityVector`):

```
target=0x0000000000000000000000000000000000000001  value=0  data=""  predecessor=0  salt=0
keccak256(abi.encode(target,value,data,predecessor,salt))
  = 0xe13ea3a1e2109dd41ea773534291e0672cfdb9c44dfafc023132149975a9a036
```
If an OZ upgrade ever changes this, the off-chain TS layer must be updated in lockstep before
any new governance proposal is submitted.
