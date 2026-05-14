# Hearst Connect — Smart Contracts

Foundry sub-project. Phase 2 ships two immutable, single-publisher contracts on **Base Sepolia**:

- `src/EventLogger.sol` — immutable on-chain journal mirroring the Proof Center event stream.
- `src/PoRRegistry.sol` — Proof-of-Reserves attestation registry, one entry per period (YYYYMM).

Phase 3 (post-Spearbit audit) will add an ERC-4626 vault on Base mainnet. **Do not deploy these
Phase 2 contracts to mainnet** — they are intentionally non-upgradable, non-pausable, single-key
publisher contracts and are only safe in a testnet / public-evidence role.

## Layout

```
contracts/
  foundry.toml
  src/
    EventLogger.sol
    PoRRegistry.sol
  test/
    EventLogger.t.sol
    PoRRegistry.t.sol
  script/
    DeployBaseSepolia.s.sol
  lib/forge-std/    # installed via forge install
```

## Install

```bash
# 1. Install Foundry (once per machine).
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 2. From the repo root, drop into the contracts folder.
cd contracts

# 3. Install dependencies (forge-std).
forge install foundry-rs/forge-std --no-git --shallow
# Use --no-git when the parent repo already tracks `lib/forge-std` as a regular folder.
# If you prefer submodules, omit --no-git and commit the resulting .gitmodules.
```

## Commands

```bash
forge build              # compile (solc 0.8.24)
forge fmt                # format Solidity sources
forge test -vv           # run all tests
forge test --gas-report  # with gas report
forge coverage           # coverage (Phase 2 target: > 90 %)
```

## Deploy to Base Sepolia

You need:

- Foundry installed.
- A funded deployer wallet on Base Sepolia (faucet: <https://www.coinbase.com/faucets/base-sepolia-faucet>).
- The Hearst publisher address (manager multisig — for Phase 2 testnet an EOA you control is fine).
- Optional: a Basescan API key for source verification.

```bash
export HEARST_PUBLISHER=0xYourMultisigOrEOA
export DEPLOYER_PRIVATE_KEY=0x...
# Optional, for verification:
export BASESCAN_API_KEY=...

forge script script/DeployBaseSepolia.s.sol \
  --rpc-url https://sepolia.base.org \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify --verifier blockscout \
  --verifier-url https://base-sepolia.blockscout.com/api
```

After deploy, paste the two addresses into the repo root `.env` (or `.env.local`):

```
NEXT_PUBLIC_EVENT_LOGGER_ADDRESS=0x...
NEXT_PUBLIC_POR_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_RPC_URL=https://sepolia.base.org
```

## Design notes (Phase 2 posture)

- **No admin, no upgrade, no pause.** The single `publisher` is immutable. If you need to rotate
  it, redeploy. This matches the Phase 2 brief and removes governance attack surface.
- **Custom errors** (`NotAuthorizedPublisher`, `PeriodAlreadyAttested`, `InvalidPublisher`,
  `InvalidPeriod`) instead of `require(..., "msg")` — cheaper and more grep-able.
- **Off-chain payloads.** `EventLogger` stores a `bytes32 contextHash` plus an IPFS CID; the heavy
  payload never touches calldata. `PoRRegistry` follows the same pattern with an `evidenceHash`
  pinning the signed PDF.
- **One attestation per period.** `PoRRegistry.publish` reverts on re-attestation. To amend, you
  must publish the next period's attestation with corrected figures and rely on the off-chain
  trail. Mutability lands with the timelock in Phase 3.
- **No OpenZeppelin dependency.** These two contracts do not need `AccessControl`, `Pausable`, or
  `Ownable`. Phase 3 vault will pull OZ for ERC-4626, AccessControl, and Pausable.

## Future

Phase 3 will add:

- `src/Vault.sol` — audited ERC-4626 USDC vault with withdrawal queue, fee module, regime-bounded
  strategy module.
- `script/DeployBaseMainnet.s.sol` — via deterministic CREATE2 factory.
- Coverage gate at 90 %+ enforced in CI, fuzzing on share math.
