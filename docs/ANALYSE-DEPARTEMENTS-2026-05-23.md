# 📊 Analyse par Département — Hearst Connect

**Date** : 2026-05-23  
**Version** : v0.1.0  
**Lignes de code** : ~38 250 (src/) + ~903 (contracts)  
**Tests** : 56 fichiers, 499 passants  

---

## 🔷 1. Frontend / UI — Score : **B+** | État : ⚠️

### Points forts

1. **Design System cohérent** — Tokens CSS Cockpit (`--ct-*`) dans `src/app/globals.css` + `tokens-layer.css`. Aucune valeur hex hardcodée. Conformité design-lock stage 0.
2. **Composants UI primitives** — 16 composants dans `src/components/ui/` (Button, Modal, ConfirmDialog, Skeleton, Card, Badge) avec `class-variance-authority` et Radix UI Slot.
3. **Accessibilité soignée** — Focus trap, Escape-to-close, restoration focus, `aria-modal`, `aria-labelledby`, `role="dialog"` sur Modal et ConfirmDialog. Skip-to-main-content dans `layout.tsx`.
4. **Error boundaries granulaires** — Segments `error.tsx` et `loading.tsx` dans presque toutes les routes admin et produit, plus `global-error.tsx` racine.
5. **Architecture Server/Client claire** — 15 `"use client"`, 22 `"use server"`. RSC prédominant ; composants clients ciblés.

### Points faibles / Dette technique

1. **Pas de lazy loading / code splitting** — Aucun `React.lazy()` ou `next/dynamic()` observé. Pages lourdes (dashboard 498 lignes, studio 653 lignes, vault-form 642 lignes) chargées en entier.
2. **Composants clients trop gros** — `output-panel.tsx` (420 lignes), `invest-form.tsx` (410 lignes), `product-rail-intra.tsx` (336 lignes) mélangent logique métier, UI et état local.
3. **Responsive incomplet** — Quelques utilitaires Tailwind (`sm:`, `lg:`) mais pas de système de breakpoints documenté. Grille fixe (`pf-fixed-*`) sur portfolio.
4. **Images non optimisées** — Seule 1 occurrence de `next/image`. Charts SVG rendus côté client sans optimisation.
5. **Tests UI quasi absents** — 0 test dans `src/components/`, 0 dans `src/hooks/` (2 hooks seulement). Toute la couche UI non testée unitairement.

### Recommandations

1. **Code splitting** avec `next/dynamic` sur les gros composants clients (dashboard, scenario-lab, invest-form).
2. **Refactoriser les composants >300 lignes** en séparant logique métier (hooks custom) de présentation.
3. **Tests UI avec React Testing Library** sur les primitives (Button, Modal) et flux critiques (login, subscription).

---

## 🔷 2. Backend / API — Score : **A-** | État : ✅

### Points forts

1. **Auth robuste multi-couches** — Sessions DB-backed (`hc_session` httpOnly/Secure/Lax), sliding window 30j/7j. Gates `requireAuth`, `requireAdmin`, `requireInvestor`. Anti-énumération par timing avec dummy hash argon2id.
2. **Rate limiting distribué** — Redis (Upstash) + fallback in-memory. Body size guard (`assertBodySize`, 1MB). Limites granulaires par route et par action.
3. **Validation Zod systématique** — 80+ schémas Zod. Toutes les entrées API et Server Actions validées avant traitement.
4. **Error handling structuré** — Logger JSON avec contexte requestId/userId hashé, intégration Sentry. Codes HTTP précis (400, 401, 413, 429, 500, 502).
5. **Audit trail complet** — `recordAdminAudit` sur toutes les mutations admin. State machine explicite pour les vaults (`ALLOWED_TRANSITIONS`).

### Points faibles / Dette technique

1. **Multisig distributions en mémoire** — `src/app/admin/distributions/actions.ts` : `pendingSigners` est un `Map` en mémoire. Redémarrage = reset des confirmations.
2. **Incohérence gestion d'erreurs** — Certaines actions retournent `{ ok: false, issues }`, d'autres `throw new Error()`. Pas de middleware d'erreur unifié.
3. **Pas de pagination** — `prisma.cockpitChat.findMany`, `prisma.position.findMany` sans `take`/`skip`. Risque de dégradation avec la croissance.
4. **Transactions Prisma limitées** — Seuls 2 fichiers utilisent `$transaction` explicitement. Les loaders dashboard utilisent `Promise.all()` sans atomicité.
5. **Tests d'intégration backend limités** — 3 tests d'intégration seulement. Aucun test E2E pour les API routes critiques.

### Recommandations

1. **Persister le multisig** — Table `DistributionApproval` en DB ou Redis pour résilience inter-instance.
2. **Unifier le pattern d'erreur** — `ActionError` typé + wrapper `withActionError()` pour harmoniser.
3. **Pagination** — `take: 50` par défaut sur tous les `findMany`, cursor-based pagination exposée.

---

## 🔷 3. Base de données — Score : **B+** | État : ✅

### Points forts

1. **Schéma bien structuré** — `prisma/schema.prisma` (526 lignes) découpé en sections thématiques (Vault, Mining, Scenarios, Auth, Customer, Admin, LLM). Commentaires explicatifs.
2. **Indexes composites pertinents** — `@@index([userId, ranAt])` sur `ScenarioRun`, `@@index([status, triggeredAt])` sur `RebalanceEvent`, `@@index([userId, updatedAt])` sur `CockpitChat`.
3. **Migration Prisma 7 propre** — Driver adapters `@prisma/adapter-pg` (prod) / `@prisma/adapter-better-sqlite3` (dev). Pas de `url = env("DATABASE_URL")`.
4. **Relations correctement configurées** — `onDelete: Cascade` sur `Session → User`, `CockpitChat → CockpitMessage`, `VaultDeployment → VaultDeploymentApproval`.

### Points faibles / Dette technique

1. **Relations sans cascade** — `Position.investorId` et `InvestorTransaction.positionId` sans `onDelete`. Lignes orphelines possibles (admit dans `customers.ts` l.40-43).
2. **JSON fields non typés** — `inputs`, `outputs`, `monthlySeries`, `diff`, `signersWhitelist` sont des `String` (JSON sérialisé) sans validation Prisma-native.
3. **Transactions explicites rares** — Seuls `vaults/actions.ts:459` et `distributions/actions.ts:222` utilisent `$transaction`. Loaders dashboard en `Promise.all()` sans atomicité.

### Recommandations

1. **Ajouter `onDelete: Cascade/SetNull`** sur les relations critiques (`Position → Investor`, `InvestorTransaction → Position`).
2. **Wrapper les loaders dashboard** dans des `$transaction([...])` quand la cohérence est requise.

---

## 🔷 4. Sécurité — Score : **A** | État : ✅

### Points forts

1. **Double-gate auth** — Edge gate (`src/proxy.ts`) + server gate (`requireAdmin()`). Distinction 401 vs 404 pour masquer l'existence admin.
2. **Rate limiting complet** — Toutes les routes API sensibles et Server Actions sensibles ont du rate limiting. Body size limits (1MB).
3. **Validation exhaustive** — Zod sur tous les inputs. Sanitization des messages chat (`sanitizeContent`). `safeUrl()` bloque les protocoles dangereux.
4. **Headers de sécurité** — CSP, HSTS (2 ans + preload), X-Content-Type-Options, Referrer-Policy dans `next.config.ts`.
5. **Session sécurisée** — httpOnly, secure (prod), sameSite=lax, durée 30j avec renouvellement glissant.

### Points faibles / Dette technique

1. **CSP avec `unsafe-inline` / `unsafe-eval`** — Requis par Next.js 16 Turbopack. Pas de nonce-based CSP (limitation connue).
2. **Rate limiting dépendant de Redis** — Fallback in-memory par-instance si Redis indisponible. Hard-fail en prod si Redis manquant.
3. **Pas de 2FA** — Auth email/password uniquement, pas de MFA/TOTP.

### Recommandations

1. **CSP nonce-based** — Quand Next.js le supportera pleinement.
2. **2FA/TOTP** — Pour les comptes admin (critique pour un produit financier).

---

## 🔷 5. Tests — Score : **B** | État : ✅

### Points forts

1. **Couverture large** — 56 fichiers de test pour 360 fichiers source TS (ratio ~15,5%). 499 tests passent en 2,5s (Vitest).
2. **Snapshots canoniques** — `src/lib/engine/__tests__/__snapshots__/` pour backtest et scénarios. Référence critique pour un produit financier.
3. **Tests d'intégration API réalistes** — 3 suites (`backtest`, `investor-memo`, `scenario-lab`) mockent les seams externes mais testent l'engine réel.
4. **Domaines couverts** — Engine financier (ratios, mining, LP PnL, Monte-Carlo), auth (session, guards, lifecycle), data (vaults, dashboard, backfill), agents (schemas), PDF rendering.

### Points faibles / Dette technique

1. **Zéro test UI** — 0 test dans `src/components/`, 0 dans `src/hooks/`. Toute la couche UI non testée.
2. **Aucun test E2E sur les API routes critiques** — Auth, rate limiting, chat non testés en intégration.
3. **Mock excessif de Prisma** — Tests d'intégration mockent `prisma` via `vi.mock("@/lib/db")` au lieu d'utiliser une base de test réelle.

### Recommandations

1. **Tests UI avec React Testing Library** — Cible : 10-15 fichiers dans `src/components/` et `src/hooks/`.
2. **Tests d'intégration DB "vraie"** — SQLite temporaire pour tester les fonctions Inngest et les loaders avec données seedées.

---

## 🔷 6. DevOps / Infra — Score : **B+** | État : ✅

### Points forts

1. **CI/CD complet** — `.github/workflows/ci.yml` : lint + typecheck (bloquant) → Vitest (bloquant) → build. Concurrency avec cancel-in-progress.
2. **Docker multi-stage** — Dockerfile optimisé (3 stages : deps → builder → runner). User non-root (`nextjs:nodejs`).
3. **Build Electron automatisé** — `.github/workflows/release-desktop.yml` : build, sign, notarize macOS via App Store Connect API key. Publication GitHub Releases.
4. **Next.js config optimisée** — `transpilePackages`, `serverExternalPackages`, `outputFileTracingExcludes`, `optimizePackageImports`. Standalone pour Docker.
5. **Prisma provider swap** — Script `scripts/prisma-provider.mjs` pour basculer SQLite ↔ PostgreSQL selon l'environnement.

### Points faibles / Dette technique

1. **Pas de staging environment** — CI teste en local/Vitest mais pas de déploiement preview/staging automatique.
2. **Pas de health check** — Aucun endpoint `/health` ou `/ready` pour les orchestrateurs (K8s, Docker Compose).
3. **Pas de monitoring infra** — Pas de métriques temps réel (CPU, mémoire, DB connections) ni d'alerting.

### Recommandations

1. **Déploiement preview Vercel** — Branch-based previews pour tester les PR en conditions réelles.
2. **Endpoint `/health`** — Check DB + Redis + external services pour les orchestrateurs.
3. **Monitoring** — Prometheus metrics ou Vercel Analytics pour le temps de réponse des API routes.

---

## 🔷 7. Smart Contracts — Score : **B+** | État : ✅

### Points forts

1. **Code clair et documenté** — NatSpec complet sur tous les contrats. Commentaires expliquant les décisions de design (decimals offset, virtual shares).
2. **OpenZeppelin audited** — `ERC4626`, `ERC20`, `Ownable` importés directement. Pas de réinvention de primitives.
3. **Tests Foundry complets** — 622 lignes de tests pour 281 lignes de contrats (ratio ~2,2:1). Mock USDC avec 6 decimals. Tests de ownership, deposits, withdrawals, minDeposit.
4. **Posture de sécurité documentée** — Commentaires explicites sur le scope (pas de yield on-chain, pas de rebalancing, pas de cross-chain). Mention de l'audit Spearbit Phase 3.

### Points faibles / Dette technique

1. **Pas de ReentrancyGuard** — Aucun contrat n'utilise `nonReentrant`. Le vault est ERC-4626 standard (pas de callbacks externes) mais pas de protection explicite.
2. **Pas de Pausable** — Aucun mécanisme de pause en cas d'incident. Le commentaire mentionne "GUARDIAN pause" pour Phase 3 post-audit.
3. **Ownable simple** — Single EOA owner sur testnet. Pas de timelock, pas de multisig (mentionné comme attendu pour mainnet).
4. **Pas d'events de sécurité** — Pas d'event pour les changements de ownership ou les paramètres critiques.

### Recommandations

1. **ReentrancyGuard** — Ajouter `nonReentrant` sur `deposit`/`withdraw` avant l'audit Spearbit.
2. **Pausable** — Implémenter `Pausable` avec rôle GUARDIAN pour la gestion d'incident.
3. **Timelock + multisig** — Remplacer `Ownable` par `AccessControl` + timelock pour mainnet.

---

## 🔷 8. Documentation — Score : **A-** | État : ✅

### Points forts

1. **ADRs structurés** — 6 ADRs dans `docs/decisions/` (Cayman ELP, Base mainnet, revenue share, attestation digest, hybrid backfill, MVP lock).
2. **Specs produit** — 5 specs dans `docs/spec/` (vision, dashboard, scenario-lab, proof-center, investor-memo).
3. **Inline documentation** — NatSpec sur les contrats, JSDoc sur les fonctions critiques (engine, auth, rate-limit).
4. **Audit trail** — `docs/audit/` avec rapports HTML et kickoff Spearbit.
5. **Méthodologie documentée** — `docs/methodology/v1.0.md` et `v2.0.md`.

### Points faibles / Dette technique

1. **Pas de README technique détaillé** — Pas de guide de contribution, pas de doc sur l'architecture des données.
2. **Pas de doc API** — Aucune documentation des endpoints API (OpenAPI/Swagger).
3. **Doc des env vars incomplète** — `.env.example` a les clés mais pas la description détaillée de chaque variable.

### Recommandations

1. **README technique** — Architecture, guide de contribution, conventions de code.
2. **Doc API auto-générée** — OpenAPI/Swagger à partir des schémas Zod.

---

## 🔷 9. Qualité de code — Score : **B+** | État : ✅

### Points forts

1. **TypeScript strict** — `strict: true` dans `tsconfig.json`. `ignoreBuildErrors: false` dans `next.config.ts`.
2. **Linting configuré** — ESLint avec règles personnalisées. `pnpm lint` dans la CI.
3. **Conventions cohérentes** — Naming (camelCase/tsx, PascalCase/components), structure de dossiers (feature-based).
4. **Faible dette de TODO** — Seulement 3 TODO dans tout le codebase (`advanced-metrics.ts`, `dashboard.ts`).
5. **Server-only / Client-only** — Directives `import "server-only"` sur les modules sensibles (logger, rate-limit, db).

### Points faibles / Dette technique

1. **Composants monolithiques** — Plusieurs fichiers >400 lignes sans séparation logique/présentation.
2. **Duplication mineure** — Patterns de validation répétés entre routes API et Server Actions.
3. **Pas de pre-commit hooks** — Husky/lint-staged non configuré. Risque de commit de code non linté.

### Recommandations

1. **Pre-commit hooks** — Husky + lint-staged pour ESLint + Prettier.
2. **Refactoriser les gros composants** — Séparation logique/présentation sur les fichiers >300 lignes.

---

## 🔷 10. Observabilité — Score : **B** | État : ✅

### Points forts

1. **Logger JSON structuré** — `src/lib/logger.ts` avec format JSON, contexte requestId/userId hashé, niveaux (debug/info/warn/error).
2. **Sentry intégré** — `captureError()` dans `src/lib/error-tracking.ts`. Forward automatique des erreurs.
3. **Audit trail admin** — `recordAdminAudit()` sur toutes les mutations admin avec userId, action, timestamp.
4. **Request context** — `src/lib/request-context.ts` pour propager requestId/userId/runId dans les logs.

### Points faibles / Dette technique

1. **Pas de métriques temps réel** — Pas de Prometheus, pas de dashboards (Grafana/Datadog).
2. **Pas de tracing distribué** — Pas de OpenTelemetry/Zipkin pour suivre une requête à travers les services.
3. **Pas d'alerting** — Pas de seuils d'alerte sur les erreurs, latence, ou rate limiting.

### Recommandations

1. **Métriques Prometheus** — Latence des API routes, taux d'erreur, DB connection pool.
2. **Alerting** — PagerDuty/Opsgenie sur les erreurs 500 ou le rate limiting dépassé.

---

## 🔷 11. Performance — Score : **B** | État : ⚠️

### Points forts

1. **Turbopack activé** — Build rapide en dev. `optimizePackageImports` pour `openai`, `@react-pdf/renderer`, `lucide-react`.
2. **Server External Packages** — Prisma, pg, better-sqlite3, Fireblocks SDK restent hors du bundle.
3. **Output file tracing optimisé** — Exclusion de schema-engine, swc, esbuild du bundle final.

### Points faibles / Dette technique

1. **Pas de caching** — Aucun cache Redis/Memcached sur les requêtes DB fréquentes (dashboard, vault data).
2. **Pas de lazy loading** — Tous les composants clients chargés upfront. Pas de `next/dynamic`.
3. **Requêtes DB potentiellement lourdes** — `findMany` sans `take` sur les listes (chats, positions, transactions).
4. **Pas d'image optimization** — `next/image` utilisé 1 seule fois. Charts SVG rendus côté client.

### Recommandations

1. **Caching Redis** — Sur les données dashboard/vault qui changent peu (TTL 5-15 min).
2. **Code splitting** — `next/dynamic` sur les gros composants clients.
3. **Pagination** — `take`/`skip` sur tous les `findMany` de listes.

---

## 🔷 12. Architecture — Score : **A-** | État : ✅

### Points forts

1. **Séparation des concerns** — `src/lib/` bien organisé (auth/, data/, engine/, agents/, pdf/, inngest/). Chaque domaine isolé.
2. **Feature-based routing** — Next.js App Router avec groupes `(product)/`, `admin/`. Layouts imbriqués.
3. **External package shell** — `@hearst/cockpit-shell` pour le layout (RailLeft, CenterPanel, RailRight). Découplage UI framework.
4. **Engine financier isolé** — `src/lib/engine/` purement fonctionnel, sans dépendance React/Next. Testable indépendamment.
5. **Background jobs** — Inngest pour les tâches async (mining-health, market-data, investor-memo, rebalancing).

### Points faibles / Dette technique

1. **Couplage fort au shell** — `@hearst/cockpit-shell` gère le layout, le chat, et potentiellement d'autres concerns. Difficile à remplacer.
2. **Pas de clean architecture / ports-adapters** — Le code métier (engine) est isolé mais les adapters (DB, API externes) sont mélangés dans `src/lib/`.
3. **Monolithique** — Tout dans un seul repo Next.js. Pas de micro-frontends ni de services séparés.

### Recommandations

1. **Boundary claire shell** — Documenter l'interface entre l'app et `@hearst/cockpit-shell`.
2. **Extraction du engine** — Packager `src/lib/engine/` comme module npm indépendant (déjà quasi-prêt).

---

## 📈 Résumé Global

| Département | Score | État | Dette critique |
|-------------|-------|------|----------------|
| Frontend / UI | B+ | ⚠️ | Bundle size, tests UI absents |
| Backend / API | A- | ✅ | Multisig en mémoire, pagination |
| Base de données | B+ | ✅ | Relations sans cascade, JSON non typés |
| Sécurité | A | ✅ | CSP unsafe-inline, pas de 2FA |
| Tests | B | ✅ | 0 test UI, mock excessif |
| DevOps / Infra | B+ | ✅ | Pas de staging, pas de health check |
| Smart Contracts | B+ | ✅ | Pas de ReentrancyGuard, pas de Pausable |
| Documentation | A- | ✅ | Pas de doc API, README technique |
| Qualité de code | B+ | ✅ | Composants monolithiques, pas de pre-commit |
| Observabilité | B | ✅ | Pas de métriques temps réel |
| Performance | B | ⚠️ | Pas de caching, pas de lazy loading |
| Architecture | A- | ✅ | Couplage shell, monolithique |

**Moyenne globale : B+**

**Forces** : Auth robuste, validation exhaustive, design system cohérent, engine financier solide, documentation structurée.

**Faiblesses** : Tests UI absents, composants monolithiques, pas de caching, multisig en mémoire, pas de pagination.
