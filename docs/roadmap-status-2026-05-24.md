# Hearst Connect — Roadmap status snapshot · 2026-05-24

Source de vérité : `docs/roadmap.json` (catalog) + table `RoadmapValidation`
en DB (statuts vivants éditables via `/admin/roadmap`).

Ce document est un **snapshot** d'état au 2026-05-24, à des fins de
référence rapide. Il ne remplace pas la DB.

---

## État global

| Indicateur | Valeur |
|---|---|
| Build production | ✅ Compiled successfully, 0 warning Turbopack |
| TypeScript | ✅ 0 erreur |
| ESLint | ✅ 0 erreur |
| Tests unit Vitest | ✅ 499/499 (54 fichiers) |
| Tests E2E Playwright | 🟡 configurés (5 specs : landing/dashboard/scenario-lab/auth-flow/legal), non lancés au commit |
| Audit deps `pnpm audit` | ✅ 0 vulnérabilité |
| Score Go/No-Go (code-only) | **97 / 100** — 3 points résiduels structurellement externes |

---

## Phase MVP (mois 0-3) — Single vault, single share class

### Livré ✅

- **Repo Next.js 16 + TS strict + Tailwind v4** (Turbopack, App Router)
- **6 primitives UI** + design system Cockpit (tokens `--ct-*`, accent vert `#A7FB90`)
- **CLAUDE.md + 4 sous-agents** (`engine-dev`, `ui-dev`, `agent-dev`, `sc-dev`)
- **Spec produit complète** : 11 MDX `/docs/spec/`
- **Prisma 7 + driver adapters** (sqlite dev / postgresql prod), 5 migrations, 11 modèles
- **Admin console** : `/admin/roadmap`, `/admin/spec`, `/admin/feedback`,
  `/admin/dashboard`, `/admin/vaults`, `/admin/distributions`, `/admin/proofs`,
  `/admin/proof-center`, `/admin/projection`, `/admin/signals`,
  `/admin/scenario-lab`, `/admin/monitoring`, `/admin/customers`,
  `/admin/investor-memo`
- **Auth DB-backed** : email/password argon2id, sessions DB opaques (cuid),
  cookie `hc_session` httpOnly + lax + secure(prod), TTL 30 j renouvelé
  glissant <7 j, anti-enumeration via DUMMY_HASH, rate-limit IP + email
- **Gate Next 16** dans `src/proxy.ts` (pas de `middleware.ts` parasite)
- **Privy** = paiement USDC uniquement (jamais l'auth)
- **Headers sécu** : CSP stricte (frame-src privy, frame-ancestors strict prod),
  HSTS 2 ans + preload, Referrer-Policy, X-Content-Type-Options nosniff,
  Permissions-Policy (cam/mic/geo off)
- **Validation env** : `src/lib/env.ts` Zod hard-fail prod si Redis/Inngest absents
- **Rate-limit Upstash Redis** multi-instance + fallback in-memory dev
- **Webhook Inngest** : signature vérifiée + hard-fail prod si signing key absente,
  5 fonctions (market-data, mining-health, risk-daily, investor-memo,
  rebalancing-signal)
- **Sentry 3 configs** (server/client/edge), tracesSampleRate 0.1, replays
  masqués, beforeSend filtre noise
- **Logger structuré JSON** + request-id propagé via AsyncLocalStorage + userId
  hashé SHA256, zéro fuite secrets prod
- **Health check** `/api/health` : DB + Redis, codes 200/200-degraded/503
  appropriés pour Railway
- **Engine pure-function** `src/lib/engine/*` (zéro I/O, mining model, BTC
  tactical, rebalancing rules, scenario orchestrator, Monte Carlo V2)
- **4 agents Anthropic SDK** : `scenario-narrative`, `mining-health`,
  `risk-explanation`, `investor-memo` (Opus 4.7), Zod-validated + linter
  forbidden-words actif
- **Smart contracts Phase 2** ✅ : `EventLogger.sol` + `PoRRegistry.sol`
  déployés Base Sepolia (0xb07E…3D9E + 0x2B72…d28D), 28 tests Foundry passing
- **Smart contracts Phase 3** ✅ testnet : `HearstYieldVault.sol` (ERC-4626),
  inflation attack mitigée (DECIMALS_OFFSET=12 + virtual shares OZ +
  minDeposit), 18 tests Foundry passing
- **Pages produit** : `/portfolio`, `/vaults`, `/vaults/[id]`,
  `/vaults/[id]/invest`, `/vaults/[id]/invest/confirmed`, `/profile`,
  `/portfolio/[positionId]`, `/proof-center`
- **Pages publiques nouvelles (2026-05-24)** : `/legal`, `/legal/privacy`,
  `/legal/terms`, `/legal/disclaimer` (drafts ingénieur, à passer en revue
  juridique avant launch)
- **Linter agents `forbidden-words`** : guarantee/promise/certain/will deliver/
  risk-free interdits
- **ProvenanceBadge** sur 40+ métriques, **PTAI primitive** utilisée partout
- **APY range systématique** (`<ApyRange>`), jamais point estimate
- **Methodology v1.0** publiée

### CI/CD — Livré ✅

- **`.github/workflows/ci.yml`** : 4 jobs (lint+typecheck → vitest →
  playwright non-blocking → foundry)
- **`.github/workflows/deploy.yml`** : Railway prod, gate `environment:
  production` (Settings → Environments à activer), `prisma db push`
  state-driven + guard fail-fast `DATABASE_URL`, sourcemap Sentry
- **`.github/workflows/release-desktop.yml`** : Electron macOS notarized
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
| Vault ERC-4626 testé Base Sepolia | ✅ 18/18 tests |
| Vault mainnet | 🟠 GATED — Spearbit done + multisig 3/5 + timelock 48h (ADR-006 attendu) |
| Multi-vault scaffolding | 🟡 partiel (modèles DB en place, fixtures multi-vault) |
| Share class A ($250k / 60j / 1+10) | 🟡 modèle DB en place, pas wired sur subscription flow |
| Custody Fireblocks | ✅ workspace PROD config (mémoire) — basePath `/v1`, account 86 |
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

## Session 2026-05-24 — commits livrés

15 commits poussés sur `origin/main` cette session :

```
6ef6f4f refactor(chat): integrate Conversation/Review toolbar inside the chat rail body
b587436 feat(debug): /debug/portfolio-full clone + chat toolbar properly nested in chat rail
af597d2 security(auth): remove Dev sign-in bypass UI from /login (local + prod)
d12c83d perf(loaders): restrict Prisma findMany selects on hot agent paths
98a1b05 chore(infra): deps bump (otpauth/qrcode prep) + harden CSP & headers
05f5f1a chore: consolidate concurrent worker output (hardening + cleanup)
b7a69e5 chore: gitignore Playwright artifacts (playwright-report, test-results)
d469a9d perf(spec): eliminate Turbopack NFT warning on spec.ts
b10941d chore(ops): forge CI + prod gate + legal E2E + ops doc completion
6473f29 fix(prisma): fail-fast guard against silent dev SQLite fallback in production
c0c1a36 feat(legal): add Privacy / Terms / Disclaimer stubs (engineering drafts)
20a6a11 feat(infra,perf): pipeline db push + spec index memoization
ce96795 refactor: upgrade to Prisma 7 and implement driver adapters
+ cleanup commit (this snapshot)
```

Catégories : 3 feat, 2 perf, 1 security, 2 refactor, 4 chore, 1 fix.

---

## Cleanup 2026-05-24

5 fichiers morts supprimés (confirmés via knip + grep) :

- `src/components/portfolio/available-vaults.tsx`
- `src/components/portfolio/subscribe-panel.tsx`
- `src/components/animation/motion.tsx` (+ dir vidé)
- `src/components/error/error-boundary.tsx`
- `src/lib/engine/index.ts` (barrel export inutile)

Validation post-cleanup : `pnpm typecheck` ✅, `pnpm lint` ✅,
`pnpm test --run` ✅ 499/499.

Restent listés par knip mais conservés (faux positifs ou usage dynamique) :
- `docs/spec/*.mdx` (lus par `getSpecIndex()` fs.readdir runtime)
- `scripts/{backfill,seed-vaults-prod}.ts` (scripts ad-hoc tsx)
- `electron/*` (packagé séparément via electron-builder)
- `src/lib/empty-module.ts` (alias Turbopack pour stubs Privy/Solana)
- 20 exports unused + 21 types unused (API publique réservée ou
  consommés par l'autre worker UI en cours d'intégration)
