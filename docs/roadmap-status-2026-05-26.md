# Hearst Connect — Roadmap status snapshot · 2026-05-26

Source de vérité : `docs/roadmap.json` (catalog) + table `RoadmapValidation`
en DB (statuts vivants éditables via `/admin/roadmap`).

Ce document est un **snapshot** d'état au 2026-05-26, à des fins de
référence rapide. Il ne remplace pas la DB.

---

## État global

| Indicateur | Valeur |
|---|---|
| Build production | ✅ Compiled successfully, 0 warning Turbopack (dernier build) |
| TypeScript | ✅ 0 erreur (`pnpm typecheck` re-run 2026-05-26) |
| ESLint | ✅ 0 erreur (`pnpm lint` re-run 2026-05-26) |
| Tests unit Vitest | ✅ **543 / 543** (60 fichiers, 4.96 s) |
| Foundry tests | ✅ **46 / 46** (3 suites : EventLogger, PoRRegistry, HearstYieldVault) |
| Tests E2E Playwright | 🟡 configurés (5 specs : landing/dashboard/scenario-lab/auth-flow/legal), non lancés au commit |
| Audit deps `pnpm audit` | ✅ 0 vulnérabilité (snapshot 2026-05-24, à re-run) |
| Score Go/No-Go (code-only) | **97 / 100** — 3 points résiduels structurellement externes |

---

## Phase MVP (mois 0-3) — Single vault, single share class

### Livré ✅

- **Repo Next.js 16 + TS strict + Tailwind v4** (Turbopack, App Router)
- **6 primitives UI** + design system Cockpit (tokens `--ct-*`, accent vert `#A7FB90`)
- **CLAUDE.md + 4 sous-agents** (`engine-dev`, `ui-dev`, `agent-dev`, `sc-dev`)
- **Spec produit complète** : 11 MDX `/docs/spec/`
- **Prisma 7 + driver adapters** (sqlite dev / postgresql prod), 5 migrations, 11 modèles
- **Admin console — 19 routes** : `/admin` (root) + `roadmap`, `spec`, `spec/[slug]`,
  `feedback`, `dashboard`, `vaults`, `vaults/new`, `vaults/[id]`,
  `vaults/[id]/edit`, `distributions`, `proofs`, `proof-center`, `projection`,
  `signals`, `scenario-lab`, `monitoring`, `customers`, `investor-memo`
- **Pages produit (route group `(product)`)** : `/portfolio`, `/portfolio/[positionId]`,
  `/profile`, `/proof-center`, `/vaults`, `/vaults/[id]`, `/vaults/[id]/invest`,
  `/vaults/[id]/invest/confirmed`
- **Pages publiques** : `/` (login split-screen wallet/email), `/login`, `/legal`,
  `/legal/privacy`, `/legal/terms`, `/legal/disclaimer` (drafts ingénieur,
  à passer en revue juridique avant launch)
- **Auth DB-backed** : email/password argon2id (`@node-rs/argon2`), sessions DB
  opaques (cuid), cookie `hc_session` httpOnly + lax + secure(prod), TTL 30 j
  renouvelé glissant <7 j, anti-enumeration via DUMMY_HASH, rate-limit IP + email
- **Gate Next 16** dans `src/proxy.ts` (pas de `middleware.ts` parasite)
- **Privy** = paiement USDC uniquement (jamais l'auth) — vérifié 2026-05-26 :
  aucun appel `privy-token` ni Privy JWT en runtime auth ; `requireAuth()`
  utilise toujours la session DB
- **Headers sécu** : CSP stricte (frame-src privy, frame-ancestors strict prod),
  HSTS 2 ans + preload, Referrer-Policy, X-Content-Type-Options nosniff,
  Permissions-Policy (cam/mic/geo off)
- **Validation env** : `src/lib/env.ts` Zod hard-fail prod si Inngest absent
  (Redis fallback in-memory en dev)
- **Rate-limit Upstash Redis** multi-instance + fallback in-memory dev
- **Webhook Inngest** : signature vérifiée + hard-fail prod si signing key absente,
  5 fonctions (`market-data-hourly`, `mining-health-daily`, `risk-daily`,
  `investor-memo-monthly`, `rebalancing-signal`)
- **Sentry 3 configs** (`sentry.server.config.ts`, `sentry.client.config.ts`,
  `sentry.edge.config.ts`), tracesSampleRate 0.1, replays masqués,
  beforeSend filtre noise
- **Logger structuré JSON** + request-id propagé via AsyncLocalStorage + userId
  hashé SHA256, zéro fuite secrets prod
- **Health check** `/api/health` : DB + Redis, codes 200/200-degraded/503
  appropriés pour Railway
- **Engine pure-function** `src/lib/engine/*` (12 fichiers, zéro I/O, mining model,
  BTC tactical, rebalancing rules, scenario orchestrator, Monte Carlo V2 avec
  PRNG seedé `prng.ts` — aucun `Math.random()` direct)
- **4 agents LLM** : `scenario-narrative`, `mining-health`, `risk-explanation`,
  `investor-memo` — tous sur **Kimi K2.6 via Hypercli** (OpenAI-compatible
  endpoint, `openai@6.x` SDK, ADR-007 décidé 2026-05-26). Pas d'`@anthropic-ai/sdk`
  dans deps. Zod-validated + linter forbidden-words actif (6 mots :
  guarantee/promise/certain/will deliver/risk-free/no risk, exemption regex
  pour "not guaranteed"). Cost tracking via `LlmRun` table (pricing Kimi
  indicatif $0.60/$2.50 per MTOK, à reconcilier avec facture Hypercli).
- **Smart contracts Phase 2** ✅ : `EventLogger.sol` + `PoRRegistry.sol`
  déployés Base Sepolia (0xb07E…3D9E + 0x2B72…d28D)
- **Smart contracts Phase 3** ✅ testnet : `HearstYieldVault.sol` (ERC-4626),
  inflation attack mitigée (DECIMALS_OFFSET=12 + virtual shares OZ +
  minDeposit)
- **Foundry 46 / 46** : 3 suites `.t.sol` (EventLogger, PoRRegistry, HearstYieldVault)
- **Linter agents `forbidden-words`** : actif (cf. `src/lib/agents/validators.ts`)
- **ProvenanceBadge** sur **101 usages** (dashboard, proof-center, profile, vaults, …)
- **PTAI primitive** (`<Ptai>` / `<PtaiBlock>`) : projection, activity-feed,
  rebalance-card, output-panel
- **APY range systématique** (`<ApyRange>`), jamais point estimate (non-negotiable #1)
- **Methodology v1.0** publiée

### CI/CD — Livré ✅

- **`.github/workflows/ci.yml`** : 4 jobs (lint+typecheck → vitest →
  playwright non-blocking → foundry)
- **`.github/workflows/deploy.yml`** : Railway prod, gate `environment:
  production` (Settings → Environments à activer), `prisma db push`
  state-driven + guard fail-fast `DATABASE_URL`, sourcemap Sentry
- **`.github/workflows/release-desktop.yml`** : Electron macOS notarized
- **`.github/workflows/seed-prod.yml`** : one-shot seed admin user (escape
  hatch `PROD_BOOTSTRAP=1`, prod-safe — no `resetTables`)
- **Dockerfile multi-stage standalone**, non-root, port 4105
- **`prisma.config.ts` fail-fast** : refuse fallback dev SQLite en
  production
- **`scripts/prisma-provider.mjs`** : swap provider sqlite↔postgresql au
  build

### Observabilité — Livré ✅

- **`src/lib/error-tracking.ts`** + `src/lib/logger.ts` (no-op si DSN absent)
- **9 error.tsx + global-error.tsx** → exposent uniquement digest opaque
  (zéro stack leak)
- **`src/lib/admin/audit.ts` `recordAdminAudit`** : trace
  action/entity/diff/IP/UA sur toutes mutations admin
- **PostHog** event-based (`autocapture: false`), opt-out dev
- **Review-mode LLM** : observability + safety (commit `39fe589`)

### Documentation — Livré ✅

- **`docs/DEPLOYMENT.md`** complet : Railway PITR, snapshot DB, Sentry alert
  recipe (4 rules table), manual approval gate, pre-deploy checklist,
  provisioning secrets gh CLI one-liners
- **`docs/decisions/`** : ADRs
- **`docs/methodology/v1.0.md`**
- **`docs/spec/*.mdx`** (11 fichiers)
- **`docs/audit/`** : 6 audits HTML

### Reste à faire MVP (HORS CODE)

| # | Action | Bloqueur |
|---|---|---|
| 1 | `rm -rf .next && pnpm test:e2e` localement | Sandbox refuse `rm -rf` pour moi → toi |
| 2 | Provisionner secrets GitHub Actions (`DATABASE_URL`, `INNGEST_SIGNING_KEY`, …) | Valeurs prod uniquement disponibles côté Adrien |
| 3 | Créer environment `production` GitHub (Settings → Environments) avec required reviewers | Action côté Adrien |
| 4 | Configurer Sentry alert rules (recipe dans `docs/DEPLOYMENT.md`) | Dashboard Sentry externe |
| 5 | Faire passer les 3 stubs légaux (`/legal/privacy`, `/legal/terms`, `/legal/disclaimer`) en revue juridique | Counsel externe |

---

## Phase V1 (mois 4-6) — Share classes + mainnet

| Item | État |
|---|---|
| Spearbit audit kickoff | ✅ Brief prêt (commit `837605d`), audit pas démarré |
| Spearbit audit complet + remédiation | 🟠 BLOQUÉ — gate mainnet (CLAUDE.md règle #8) |
| Vault ERC-4626 testé Base Sepolia | ✅ 46 tests Foundry (incl. inflation attack) |
| Vault mainnet | 🟠 GATED — Spearbit done + multisig 3/5 + timelock 48h (ADR-006 attendu) |
| Multi-vault scaffolding | 🟡 partiel (modèles DB en place, fixtures multi-vault) |
| Share class A ($250k / 60j / 1+10) | 🟡 modèle DB en place, pas wired sur subscription flow |
| Custody Fireblocks | ✅ workspace PROD config (basePath `/v1`, account 86) ; dynamic import `@fireblocks/ts-sdk` (commit `19aacfa`) |
| KYC/KYB | 🟠 processor non sélectionné |
| LP portal per-LP P&L | 🟡 base existe via `/portfolio/[positionId]` |
| Advanced metrics (Sharpe/Sortino/VaR) | 🟡 calculs en engine, UI partielle |

---

## Phase V2 (mois 7-12) — Variants + tokenisation

Aucun item démarré. Vault Defensive + BTC Plus, Monte Carlo (déjà
implémenté côté engine — utilisable une fois methodology v2 publiée),
auto-execution sous guardrails, white-label, tokenised share class
(ERC-20 wrapper).

---

## Vérification câblage 2026-05-26

Audit exhaustif lancé ce jour — résultats consolidés :

| Check | Claim roadmap | Réel | Statut |
|---|---|---|---|
| TypeScript | 0 erreur | 0 erreur | ✅ |
| ESLint | 0 erreur | 0 erreur | ✅ |
| Vitest | 499/499 (snapshot 05-24) | **543/543 (60 fichiers)** | ✅ corrigé |
| Foundry | 28 + 18 = 46 | 46 fonctions, 3 `.t.sol` | ✅ exact |
| Engine pur | aucun I/O | confirmé (12 fichiers, prng seedé) | ✅ |
| 4 agents + linter | présents | confirmés + 6 forbidden words | ✅ |
| Gate `src/proxy.ts` | présent | présent, aucun middleware.ts | ✅ |
| Auth argon2id + `hc_session` | présent | `@node-rs/argon2`, model Session OK | ✅ |
| Privy = paiement only | présent | 2 commentaires stale "Privy JWT" corrigés ce jour (backtest/run, scenario-lab/actions) | ✅ corrigé |
| Smart contracts Phase 2+3 | présents | 3 `.sol` + 46 tests | ✅ |
| Admin routes | 14 claimed | **19 `page.tsx`** | ✅+ |
| Inngest 5 fonctions + signature | présents | OK | ✅ |
| Sentry 3 configs | présents | OK | ✅ |
| Health `/api/health` | présent | OK | ✅ |
| CI/CD | 3 workflows | **4 workflows** (+ seed-prod.yml) | ✅+ |
| ProvenanceBadge | 40+ | **101 usages** | ✅+ |
| `<Ptai>` + `<ApyRange>` | utilisés | utilisés | ✅ |
| Methodology v1.0 | publiée | publiée | ✅ |

**Divergences résiduelles** : aucune. Snapshot et code sont alignés.

---

## Commits récents (depuis snapshot précédent)

```
39fe589 feat(llm): observability + safety on the review-mode LLM pipeline
19aacfa fix(custody): dynamic import for @fireblocks/ts-sdk
ad56ebf feat(seed): add PROD_BOOTSTRAP=1 escape hatch to seed empty prod DB
4fab602 fix(review-mode): plug 3 silent data-loss bugs + add observability
3500413 fix(seed): use PrismaPg adapter (Prisma 7 requires driver adapter)
25a23ca fix(ci): seed-prod uses admin-only script (no resetTables, prod-safe)
558ee77 chore(ci): add one-shot seed-prod workflow for admin user creation
88f15a1 fix(ci): revert schema.prisma provider to sqlite (default for local/CI)
e2df0e3 fix(ci): pin pnpm@10, correct railway token scope, set prisma provider postgresql
60f77e0 fix(ci): railway up needs --environment when --project is passed
```
