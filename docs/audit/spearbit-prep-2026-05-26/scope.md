# Audit Scope — Hearst Yield Vault

**Freeze SHA:** `8ba18c99a5b1ebce225ca3dbce7d4c9372a4be24`

---

## 1. Smart Contracts (Primary Scope)

All three contracts live under `contracts/src/` in the frozen commit.

| Contract | Path | Phase | Notes |
|---|---|---|---|
| `EventLogger` | `contracts/src/EventLogger.sol` | Phase 2 ✅ | On-chain event log for off-chain proofs; deployed Base Sepolia |
| `PoRRegistry` | `contracts/src/PoRRegistry.sol` | Phase 2 ✅ | Proof-of-Reserve registry; oracle-updatable |
| `HearstYieldVault` | `contracts/src/HearstYieldVault.sol` | Phase 3 | ERC-4626 vault; mainnet deploy gated on this audit |

Foundry build artefacts, tests, and scripts under `contracts/test/` and `contracts/script/` are reference material — auditors may read them but they are not deployable scope.

---

## 2. Web / API Paths (In-Scope)

These server-side surfaces interact with on-chain state or govern vault operations.

| Path | Type | Description |
|---|---|---|
| `src/app/admin/roadmap/actions.ts` | Server Action | Upsert roadmap validation state; admin-only |
| `src/app/api/inngest/route.ts` | API Route | Inngest webhook receiver; signed with `INNGEST_SIGNING_KEY` |
| `src/app/api/governance/*` | API Routes | On-chain governance action triggers (propose, vote, execute) |
| `src/app/api/vault/subscribe` | API Route | Subscription intake — KYC gate → on-chain deposit call |
| `src/app/api/vault/distribute` | API Route | Monthly distribution trigger — admin-only, Safe multisig co-sign |
| `src/proxy.ts` | Middleware proxy | Authentication gate; Privy JWT verification |

---

## 3. Engine Purity Invariants (In-Scope for logic review)

The scenario engine (`src/lib/engine/`) is a pure-function layer. Auditors should verify:

- No `fetch`, no `prisma`, no `process.env`, no `Date.now()`, no `Math.random()` (ungoverned PRNG) inside any file under `src/lib/engine/`.
- Monte Carlo paths inject a seeded PRNG; seed is caller-supplied (no internal entropy).
- APY outputs are always ranges (`[low, high]`), never single-point floats.
- Projection objects always carry `assumptions[]` and `disclaimer: "not guaranteed"`.

---

## 4. Agent / LLM Invariants (In-Scope for logic review)

Agents under `src/lib/agents/` must be reviewed for:

- Output schema enforcement: all four agents return Zod-validated structured JSON only (no freeform text).
- Forbidden-word linter applied before any agent response reaches the API layer: `guarantee`, `promise`, `certain`, `will deliver`, `risk-free`.
- No agent has write access to the database or the ability to trigger on-chain transactions.
- LLM provider pinned to `kimi-k2.6` via Hypercli; no dynamic model selection from user input.
- Prompt injection surfaces: user-supplied strings (investor memos, scenario descriptions) must be sanitised before template injection.

---

## 5. Out-of-Scope

| Item | Reason |
|---|---|
| Frontend UI components (`src/components/`) | Visual layer, no business logic, no on-chain calls |
| Marketing / landing pages | Static content, no state mutation |
| Fireblocks custody integration | Covered by Fireblocks' internal compliance and SOC 2 programme |
| Privy authentication SDK internals | Third-party; Privy holds their own security programme |
| Inngest SDK internals | Third-party; HMAC signing of webhooks is in-scope (see threat model) |
| `prisma/schema.prisma` migrations | Off-chain DB schema; no direct fund exposure |
| `docs/` folder content | Documentation only |
| CI/CD pipeline (GitHub Actions) | Infrastructure, not smart contract security |
| Admin UI React components | No business logic; admin access already gated |

---

## 6. Access Provisioning Table

| Resource | Access type | To be provided by |
|---|---|---|
| GitHub repo (frozen SHA) | Read-only collaborator | @adrien-debug |
| Verified Foundry build artefacts | Shared ZIP + `forge build` repro instructions | Engineering |
| Base Sepolia deployed addresses | Listed in `contracts/README.md` | Engineering |
| Testnet ETH (Base Sepolia) | Faucet top-up on request | Engineering |
| Admin console (staging env) | Read-only credentials | Engineering |
| Inngest dashboard (staging) | Read-only invite | Engineering |
| Architecture call (60 min) | Zoom, recorded | Engineering + auditor lead |
| Dedicated Telegram/Signal channel | Async Q&A during audit | adrien@hearstcorporation.io |
