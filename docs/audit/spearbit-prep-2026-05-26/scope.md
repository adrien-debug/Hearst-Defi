# Audit Scope — Hearst Yield Vault

**Freeze SHA:** `898991c6ee3c3bfe7637509ecee7ac579dc79388`
**OZ dependency:** v5.6.1 @ `5fd1781b1454fd1ef8e722282f86f9293cacf256`

---

## 1. Smart Contracts — Primary Scope

All three contracts live under `contracts/src/` at the freeze SHA. Solc `0.8.24`,
optimizer 200 runs, EVM `cancun`, `via_ir = false` (`contracts/foundry.toml`).

| Contract | Path | Inherits (OZ v5.6.1) | Custom surface (the only bespoke logic) |
|---|---|---|---|
| `HearstYieldVault` | `contracts/src/HearstYieldVault.sol` | `ERC4626`, `ERC20`, `Ownable`, `Pausable` | `_decimalsOffset()=12`; `minDeposit` floor enforced in `_deposit`; `guardian` role with `pause()`/`unpause()`; `setGuardian()`/`setMinDeposit()` (owner); `whenNotPaused` on `_deposit` + `_withdraw` |
| `PoRRegistry` | `contracts/src/PoRRegistry.sol` | none (standalone) | Immutable single `publisher`; `publish()` (one attestation per `YYYYMM` period, append-only); `getAttestationByPeriod()` view |
| `EventLogger` | `contracts/src/EventLogger.sol` | none (standalone) | Immutable single `publisher`; `logEvent()` (monotonic id, append-only) |

**Exact public/external entry points to review:**

- `HearstYieldVault`: inherited ERC-4626 `deposit` / `mint` / `withdraw` / `redeem` /
  `convert*` / `preview*` / `max*`; inherited ERC-20 `transfer` / `approve` / etc.; custom
  `setMinDeposit(uint256)` (`onlyOwner`), `setGuardian(address)` (`onlyOwner`),
  `pause()` (`onlyGuardian`), `unpause()` (`onlyGuardian`), `decimals()`,
  `guardian()` / `minDeposit()` (public getters). **There is no `subscribe`, `distribute`,
  `rebalance`, `pauseVault`, `permit`, oracle hook, fee logic, withdrawal queue, or upgrade
  path.**
- `PoRRegistry`: `publish(uint64 period, uint256 totalAumUsd, uint256 minedBtcSats, bytes32 evidenceHash, string evidenceCid)` (`onlyPublisher`), `getAttestationByPeriod(uint64)`,
  public getters `attestations` / `attestationIdByPeriod` / `lastAttestationId` / `publisher`.
- `EventLogger`: `logEvent(EventKind kind, bytes32 contextHash, string payloadCid)`
  (`onlyPublisher`), public getters `lastEventId` / `publisher`.

`contracts/test/` and `contracts/script/` are reference material (auditors may read them; not
deployable scope).

---

## 2. Governance Configuration — In Scope (configuration only, not the code)

The deployed ownership wiring is in scope as a **configuration review** (the underlying
contracts are audited dependencies, not custom code):

| Element | What to review | Code/Config reference |
|---|---|---|
| `TimelockController` (OZ v5.6.1) | `minDelay == 172800` (48h); `proposers == executors == [Safe]`; `admin == address(0)` (self-administered); Safe also holds `CANCELLER_ROLE` | `contracts/script/DeployGovernance.s.sol`; verified by `contracts/test/Governance.t.sol` (13 tests) |
| Gnosis **Safe 3/5** | 5 owners, threshold 3; deployed via Safe UI (off-Foundry); set as Timelock proposer/executor and as `publisher` of EventLogger/PoRRegistry | Deployment runbook (operator action) |
| Vault ownership transfer | `vault.transferOwnership(timelock)` post-deploy; `guardian` distinct from `owner` | `DeployHearstYieldVault.s.sol` + runbook |
| `hashOperation` parity | Off-chain `src/lib/governance/eip712.ts` must match on-chain `TimelockController.hashOperation` | Parity vector pinned in `architecture.md` + `Governance.t.sol` |

---

## 3. Out of Scope

| Item | Reason |
|---|---|
| OpenZeppelin v5.6.1 source (ERC4626, ERC20, Ownable, Pausable, TimelockController) | Audited upstream; only our usage/config is in scope |
| Gnosis Safe contracts | Audited by Safe; only our 3/5 configuration is in scope |
| Frontend (`src/components/`, `src/app/`) incl. the invest UI and `src/lib/onchain/vault.ts` (viem client calls) | App layer; no funds custody, calls the audited vault from the client |
| Off-chain governance (`src/lib/governance/*` — server actions, state machine, EIP-712 hashing) | Off-chain orchestration; produces hashes for the Safe/Timelock, holds no funds |
| Scenario engine (`src/lib/engine/*`) | Pure-function, no I/O, no on-chain calls — not part of the contract audit |
| LLM agents (`src/lib/agents/*`) | Structured-JSON only, no DB write authority, cannot trigger on-chain tx |
| Inngest jobs / `src/app/api/*` routes | Off-chain; HMAC-verified webhooks; no direct fund path |
| Fireblocks custody integration | Viewer read-only; covered by Fireblocks' own SOC 2 / compliance |
| `prisma/schema.prisma`, `docs/`, CI/CD | Off-chain DB / docs / infra |

> Note: the earlier draft listed engine/agent invariants and `/api/vault/*` and
> `/api/governance/*` routes as in-scope. Those API routes **do not exist** (governance is
> implemented as server actions, not REST routes; there is no `/api/vault`). The engine and
> agents are off-chain and excluded from this contract-focused audit. They can be shared as
> optional context on request but are not billed scope.

---

## 4. Access Provisioning

| Resource | Access type | Provided by |
|---|---|---|
| GitHub repo (freeze SHA `898991c`) | Read-only collaborator | @adrien-debug |
| Verified Foundry build (OZ submodule `5fd1781`) | `forge build` repro + `foundry.toml` | Engineering |
| Base Sepolia deployed addresses | `contracts/README.md` + `abi-freeze.json` (`deployed_address`) | Engineering |
| Testnet ETH (Base Sepolia) | Faucet top-up on request | Engineering |
| Architecture call (60 min) | Zoom, recorded | Engineering + auditor lead |
| Dedicated Telegram/Signal channel | Async Q&A during audit | adrien@hearstcorporation.io |
