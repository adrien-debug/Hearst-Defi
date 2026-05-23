# Spearbit Audit Kickoff — Hearst Connect

> **Roadmap item**: `audit-kickoff` (MVP w13)
> **Status**: Brief ready for engagement
> **Gating**: CLAUDE.md non-negotiable #8 — *mainnet vault deploy is blocked until this audit is delivered and remediated*. ADR-006 lifts the V1/V2 scope but does not lift this gate.
> **Date**: 2026-05-23

---

## 1. Engagement summary

Hearst Connect is a single-vault institutional DeFi platform (Hearst Yield Vault):
mining-backed structured yield, monthly USDC distributions, Cayman SPV wrapper.
This audit covers the **on-chain surface (Solidity, Foundry, Base)** and the
**web/API surface (Next.js, Prisma, Vercel)** that fronts the vault. The vault
ERC-4626 contract is written and tested on Base Sepolia (commit `a63926b`) but
**will not deploy to mainnet** until this report is delivered and the P0/P1
findings are remediated.

We are looking for:
1. A findings report (P0/P1/P2) on the in-scope code.
2. Remediation guidance for each P0/P1.
3. A short attestation letter we can publish on the Proof Center (`/proof-center`)
   after we fix the blocking items, for institutional LP communication.

---

## 2. In-scope

### 2.1 Smart contracts (`contracts/`)
Foundry sub-project, OpenZeppelin primitives, Solidity ^0.8.

| File | Role | Phase | Notes |
|------|------|-------|-------|
| `src/EventLogger.sol` | Immutable on-chain journal of the Proof Center event stream | Phase 2, deployed on Base Sepolia | Non-upgradable, non-pausable, **single-key publisher** (intentional, evidence-only). |
| `src/PoRRegistry.sol` | Proof-of-Reserves attestation registry, one entry per `YYYYMM` period | Phase 2, deployed on Base Sepolia | Same posture as EventLogger. |
| `src/HearstYieldVault.sol` | ERC-4626 vault: deposit USDC → shares → yield → distribution | Phase 3, **testnet only until this audit passes** | Multi-sig owner, soft lock-up, mgmt + perf fee, hurdle. **This is the load-bearing contract for investor funds.** |

Tests: `contracts/test/*.t.sol`. Deploy script: `contracts/script/DeployBaseSepolia.s.sol`.

### 2.2 Web/API surface (`src/`)
Next.js 16, TypeScript strict, Prisma + Postgres (Supabase prod).

- **Auth (`src/lib/auth/`)** — email/password (argon2id, `@node-rs/argon2`), opaque-cuid session cookie `hc_session` (httpOnly, TTL 30d), role gate (`requireInvestor` / `requireAdmin`), edge proxy at `src/proxy.ts`, rate-limit on login (10/min/IP). **Privy is NOT used for auth** — only the optional USDC deposit/wallet-connect flow.
- **Server Actions (`src/app/**/actions.ts`)** — all admin mutations gated by `requireAdmin()` (`AdminAudit` table logs each), Zod input validation, no `as unknown as` casts.
- **API routes (`src/app/api/`)**
  - `/api/inngest` — webhook entrypoint, signature-verified via `INNGEST_SIGNING_KEY` (env-validated, throws at boot in prod if missing — see `src/lib/env.ts:95`).
  - `/api/cockpit-chat`, `/api/cockpit-chats` — admin-gated chat history endpoints.
  - `/api/backtest/run` — engine compute, auth-gated, rate-limited.
  - `/api/admin/review-document`, `/api/admin/review-mode` — admin LLM tools.
- **Env validation (`src/lib/env.ts`)** — Zod schema parsed at boot. `DATABASE_URL` mandatory; `INNGEST_SIGNING_KEY` mandatory in production (hard throw). Privy/Fireblocks/Hypercli/Sentry all optional, app degrades gracefully.
- **Headers (`next.config.ts`)** — HSTS preload, CSP with `frame-ancestors` (controls hub embedding), `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Turbopack runtime requirement — please flag if you see a viable CSP nonce migration path).
- **CSRF** — Next.js Server Actions ship their own origin check; we do not layer additional CSRF tokens.
- **Custody (`src/lib/data/custody.ts`)** — Fireblocks Vault Account `86` (read-only Viewer API key, no signing), `/v1` basePath. PoR aggregation reads reserves only.

### 2.3 Engine purity (`src/lib/engine/`)
Pure-function rule-based scenario / backtest / rebalancing-rules engine. **No
fetch, no DB, no `Math.random()`, no `Date.now()`** inside engine modules — PRNG
seed is always injected (ADR-006 confirms this also holds for Monte Carlo V2).
Look for any leak of impurity that would let an attacker influence engine output
through a side channel.

### 2.4 Agents / LLM safety (`src/lib/agents/`)
4 structured-output agents (Scenario Narrative, Mining Health, Risk Explanation,
Investor Memo). Structured outputs only (Zod-validated), forbidden-words linter
(`guarantee`, `promise`, `certain`, `will deliver`, `risk-free`), no free-form
chat. Off-vendor: Kimi via Hypercli OpenAI-compatible endpoint (`HYPERCLI_*` env).
**`@anthropic-ai/sdk` was removed** from the runtime in commit `6e380d0` — the
prior Anthropic LLM client now routes through the same single Kimi backend.

---

## 3. Out-of-scope (informational, lower priority)

- UI / UX / design-system compliance (audited separately, see `/audit-full`).
- Business-logic correctness of the engine math (we will commission a separate
  quant review).
- Performance / scale (we are pre-launch).
- Methodology v1.0 itself (`docs/methodology/v1.0.md`) — content is a product
  decision, not an audit target. Implementation faithfulness to it IS in scope
  (we want to know if a path bypasses the documented assumptions).

---

## 4. Threat model — what we are afraid of

| ID | Concern | Asset at risk | Mitigation today |
|----|---------|---------------|------------------|
| T1 | Vault drain via reentrancy / share-accounting bug | Investor principal | OZ ReentrancyGuard, ERC-4626 reference, multi-sig owner. **Please scrutinise the deposit/withdraw share-price calc.** |
| T2 | Distribution skew (one investor over-paid) | Investor yield | `prisma/seed.ts` deterministic, 2-of-N signer approval on every distribution (`VaultDeploymentApproval`). |
| T3 | Attestation forgery (PoR or Mining metrics) | LP trust | Off-chain attestation digest stored, hash mirrored on-chain (PoRRegistry). ADR-004. |
| T4 | Unauthenticated background job trigger | LLM cost / data integrity | `INNGEST_SIGNING_KEY` verified on every webhook hit (boot-time enforced). |
| T5 | Admin session theft → vault state mutation | Operational | httpOnly opaque-cuid cookie, admin role gated at layout + each `actions.ts`, full `AdminAudit` log. |
| T6 | Privy / wallet-connect handler hijack | USDC deposit redirect | Privy used only for the deposit step, no auth power. Server-side `subscribe()` action re-validates. |
| T7 | Custody-data exposure | LP/operational confidentiality | Fireblocks key is **Viewer only** (no signing). |
| T8 | Race on multi-sig approval (double-spend of signer slot) | Governance | Unique constraint `(deploymentId, signerWallet)` in DB. Worth verifying it cannot be bypassed via concurrent inserts. |

---

## 5. Known issues / pre-audit hardening (we already plan to fix)

We list these so you don't burn cycles on them. **If you find a NEW issue in any
of these areas, flag it normally.**

### 5.1 Web/API
- **`requireAdmin()` defense-in-depth** — 5 admin pages (`proofs`, `spec`,
  `scenario-lab`, `proof-center`, `investor-memo`) currently rely on the layout
  gate alone. Layout `requireAdmin()` is authoritative, but direct page-level
  call is the dominant convention (12/17 admin pages). Will align.
- **`output: "standalone"` gated by `STANDALONE_BUILD`** — Vercel functions
  exclude it; Docker / self-host sets the flag. Already shipped (`next.config.ts`),
  but the gate name is generic — please flag if you see a footgun there.
- **`outputFileTracingExcludes` / `outputFileTracingIncludes`** —
  Prisma engine routing on Vercel. Worth a sanity check: only the
  `rhel-openssl-3.0.x` engine should be in the function bundle.
- **CSP `unsafe-inline` + `unsafe-eval`** — required by Turbopack runtime
  today. We accept the looser policy and would welcome a nonce-based migration
  path if you have one battle-tested for Next.js 16.

### 5.2 Smart contracts
- **EventLogger / PoRRegistry single-key publisher** — intentional for
  evidence-only Phase 2 (testnet). The HearstYieldVault (Phase 3) is multi-sig.
  Please confirm the multi-sig wiring is correct, not the Phase 2 publisher
  posture.
- **No upgradeability** on any of the three contracts. We prefer redeploy +
  migration over proxy patterns. Please confirm this is acceptable for vault
  emergency response (pause without upgrade).

### 5.3 Agents / LLM
- **Forbidden-words linter** is unit-tested but only at the agent-output
  boundary. A model could in theory produce output that passes the lint but is
  semantically a guarantee. We accept this risk for MVP.
- **Hypercli backend** — we trust the upstream provider's transport security.
  No request-level signing today.

### 5.4 Data / runtime
- **Prisma datasource provider** is now env-driven (`PRISMA_PROVIDER`) so local
  dev stays on SQLite while prod is Postgres. The `scripts/prisma-provider.mjs`
  hook flips the `provider =` line before `prisma generate`. Worth flagging if
  this introduces a build-time TOCTOU risk you can think of.
- **RLS** is not enabled on the Hearst Connect Supabase project tables — the
  app talks to Postgres only through Prisma (server-side, service-role-equivalent
  via direct connection string). The anon/JWT key surface is **not** used for
  this app. Please confirm this is a sound posture for the Hearst Connect
  scope (vs an RLS-everywhere posture we would adopt if we ever exposed the
  Supabase client to the browser).

---

## 6. Access plan

| Resource | Access |
|----------|--------|
| Source repo | `https://github.com/Hearst-Corporation/Hearst-Defi` — we provide read access to the auditor's GitHub handles. |
| Production app | `https://connect.hearst.app` — login provisioned (see secure handoff channel). |
| Vercel project | Read-only access to deployment logs + env var names (not values). |
| Supabase project | `hearst-connect` (ref `cnisndlptnuivupgxcmq`), eu-west-1 — read-only project role for the auditor. |
| Base Sepolia deploys | Etherscan addresses in `contracts/broadcast/`. |
| Methodology + ADRs | `docs/methodology/v1.0.md` + `docs/decisions/ADR-*.md`. |
| Slack / async | Dedicated channel `#hearst-spearbit-audit` — opened on engagement signature. |

We do **not** share: Vercel env-var values, Fireblocks API key, Supabase DB
password (will be rotated post-audit anyway), Hypercli token.

---

## 7. Deliverables expected from Spearbit

1. **Findings report** in markdown or PDF, severity-classified (P0 / P1 / P2 / Informational).
2. **Per-finding remediation guidance** — pseudocode or diff snippets where
   useful.
3. **Re-review pass** after we ship the fixes (1–2 cycles included in
   engagement).
4. **Attestation letter** (1–2 pages, signable) that we can publish on
   `/proof-center` once P0/P1 are remediated. Template welcome.

---

## 8. Timeline + next step

| Step | Owner | Target |
|------|-------|--------|
| Kickoff brief shared with Spearbit | Adrien (founder) | This week |
| Engagement signed + access provisioned | Both | +1 week |
| Audit execution | Spearbit | per their estimate (typically 2–3 weeks) |
| Findings report delivered | Spearbit | end of audit window |
| Remediation + re-review | Eng + Spearbit | 1–2 weeks |
| **`audit-final` roadmap item closes** | Eng | once attestation letter ready |

**The mainnet deploy of `HearstYieldVault.sol` is blocked until this loop closes.**
See CLAUDE.md non-negotiable #8 and ADR-006.

---

## 9. Open questions for Spearbit (please answer pre-engagement)

1. Estimated engagement window for the scope above (3 contracts + web/API surface)?
2. Do you cover the API surface separately from the Solidity, or as one engagement?
3. Standard severity rubric — do you use OWASP, Trail of Bits, or your own?
4. Re-review policy — does the quoted price include 1 round of re-review post-fix?
5. Public disclosure window after the attestation letter — what's your default?

---

*Owner: Adrien (founder/eng) · Contact: hearst.ai.app@gmail.com*
