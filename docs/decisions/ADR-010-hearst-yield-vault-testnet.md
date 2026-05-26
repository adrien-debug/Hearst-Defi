# ADR-010 — HearstYieldVault deployed to Base Sepolia (testnet, paper phase)

**Status:** Accepted, 2026-05-26
**Deciders:** Adrien (deployer EOA), Pierre (admin)
**Supersedes:** —

## Context

Until today, the product surface (`/vaults`, `/vaults/[id]`, the subscription
flow) had **no real on-chain contract** behind any vault row. The DB had
three `VaultDeployment` rows (`hearst-yield-vault`, `hearst-defensive-vault`,
`hearst-btc-plus-vault`) with `contractAddress = NULL`. The `isPlaceholderVault`
filter in `src/lib/data/vaults.ts` correctly treated those as fake and the UI
honestly displayed "No products available right now."

The Phase 3 ERC-4626 contract `src/HearstYieldVault.sol` was written, tested
(Foundry), and reviewable but never broadcast. CLAUDE.md non-negotiable #8
prevents a **mainnet** deploy until the Spearbit audit completes. Nothing
prevents a **testnet** deploy — it costs <$1, validates the UX flow end-to-end,
and gives the demo a real Basescan link to point at.

## Decision

Deploy `HearstYieldVault.sol` to **Base Sepolia (chain 84532)** with the
parameters below. Wire the resulting address into the app so `/vaults`
shows a real product instead of the empty state.

### Deployment record

| Field | Value |
| --- | --- |
| Chain | Base Sepolia (84532) |
| Contract | `HearstYieldVault.sol` (ERC-4626) |
| Address | `0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d` |
| Tx hash | `0xce9ca54f6c8aa8d0d2ccc15d3b022f184f398585dbbeba5cd16c2f9a70aa494b` |
| Block | `0x281489d` (~42 M) |
| Gas used | 1,252,161 |
| Deployer EOA | `0x1d1d87443f7B76f7C2248956240dE735Bce81707` |
| Owner (manager) | `0x5530db3B10e3F872ffA89cD2e3C542e9351EAA57` |
| Asset (USDC Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Share name | `Hearst Yield Vault Share` |
| Share symbol | `hyvUSDC` |
| Minimum deposit | `1_000_000_000` (1 000 USDC, 6 decimals) |
| Date | 2026-05-26 |

Basescan: <https://sepolia.basescan.org/address/0xec733c6dbd69f862489a9da01338aa5d39c1f60d>

### App wiring

- `.env.local` (gitignored) adds `NEXT_PUBLIC_HEARST_YIELD_VAULT_ADDRESS=…`
- Vercel project env var pushed via REST API (production + preview + development).
- Postgres prod (`cnisndlptnuivupgxcmq` `hearst-connect`) row updated via the
  Supabase MCP:
  ```sql
  UPDATE "VaultDeployment" SET
    "contractAddress" = '0xEc733c6dbD69F862489a9Da01338aA5D39C1F60d',
    network = 'base-sepolia',
    "deployedAt" = NOW()
  WHERE id = 'hearst-yield-vault';
  ```

## Rationale

- **Costs essentially nothing** on testnet (~$0.05 of test ETH consumed).
- **Unblocks the demo**: the `.dmg` shipped 2026-05-26 lands users on a
  product where `/vaults` shows the real vault instead of an empty state.
- **No audit risk**: testnet is throw-away. Mainnet stays gated per the
  CLAUDE.md non-negotiable #8 and ADR-006.
- **Validates the integration**: viem readers in `src/lib/chain/*` finally
  hit a contract with the ABI we wrote, not a placeholder address.

## Consequences

### Positive
- Investors can connect a wallet, see the vault address on Basescan,
  attempt a (testnet) subscribe.
- The `isPlaceholderVault` filter automatically lets the row through
  (40-char non-zero address) without any code change.

### Negative / risks
- The deployer EOA `0x1d1d87…1707` holds the private key in `.env.local`.
  Anyone with that key can call any non-restricted method. Mitigation:
  the key is **testnet only**, never funded with real money.
- The `owner` is a single EOA (`0x5530db…AA57`), not a Safe multisig.
  Acceptable on testnet; **must move to a Safe** before mainnet.
- The `defensive` and `btc-plus` vault rows in the DB are still
  placeholders (`contractAddress=NULL`). They stay invisible until they
  are deployed individually.

## Compliance / disclosure

- This deployment is for **testing and demonstration only**.
- No real assets are at risk.
- The contract has **not been audited**. Spearbit audit pack ready at
  `docs/audit/spearbit-prep-2026-05-26/`.
- Mainnet deploy remains forbidden until the audit completes and the
  remediation is reviewed (CLAUDE.md #8, ADR-006).

## Alternatives considered

- **No deploy at all** — keep the empty state. Rejected: the demo would
  show a product that has nothing behind it; a deployed testnet contract
  is more credible at zero risk.
- **Deploy on Sepolia (Ethereum)** — same effect but more expensive gas
  and the on-chain readers point at Base. Rejected.
- **Deploy via a Safe multisig from day 1** — out of scope for a 5-min
  ops action; the Safe pivot is owned by the V1 mainnet plan.
