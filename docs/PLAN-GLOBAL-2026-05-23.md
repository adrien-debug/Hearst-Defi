# 🗺️ Plan Global — Hearst Connect

**Date** : 2026-05-23  
**Version produit** : v0.1.0 (MVP finalisé, prêt pour V1)  
**Objectif** : Passer de MVP → V1 production-ready (mainnet, share classes, LP portal)

---

## 📋 Résumé Exécutif

Le MVP est **fonctionnellement complet** — toutes les features roadmap MVP sont implémentées et testées (499 tests passants). Le projet est dans un état **solide mais pas production-ready** pour un produit financier institutionnel.

**Ce plan couvre la transition MVP → V1** avec 4 volets prioritaires :
1. **Sécurité & Robustesse** (production hardening)
2. **Smart Contracts Mainnet** (audit + déploiement)
3. **Share Classes & LP Portal** (feature V1)
4. **Performance & Observabilité** (scaling)

---

## 🎯 Vue d'Ensemble des 4 Volets

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PLAN GLOBAL V1                                       │
├──────────────┬──────────────┬──────────────────┬────────────────────────────┤
│  VOLET 1     │  VOLET 2     │  VOLET 3         │  VOLET 4                   │
│  Sécurité    │  Smart       │  Share Classes   │  Performance               │
│  & Robustesse│  Contracts   │  & LP Portal     │  & Observabilité           │
├──────────────┼──────────────┼──────────────────┼────────────────────────────┤
│ • 2FA/TOTP   │ • Audit      │ • Share Class A  │ • Caching Redis            │
│ • Health chk │   Spearbit   │ • Share Class B  │ • Pagination DB            │
│ • Pagination │ • Remédiation│ • LP Portal      │ • Metrics Prometheus       │
│ • Multisig   │ • Mainnet    │ • Fireblocks     │ • Alerting                 │
│   persisté   │   deploy     │   custody        │ • Lazy loading             │
│ • Tests E2E  │ • Timelock   │ • Persona KYC    │ • Code splitting           │
│ • Staging    │   + multisig │                  │                            │
└──────────────┴──────────────┴──────────────────┴────────────────────────────┘
```

---

## 🔷 VOLET 1 — Sécurité & Robustesse (P0)

**Objectif** : Rendre l'application prête pour la production institutionnelle.

### Étape 1.1 : Authentication Hardening
- [ ] **2FA/TOTP pour admin** — Implémenter TOTP avec `speakeasy` ou `otpauth`
  - DB : ajouter `totpSecret` à `User` model
  - UI : QR code setup + code verification
  - API : vérification TOTP obligatoire pour `requireAdmin`
  - Fichiers : `prisma/schema.prisma`, `src/lib/auth/totp.ts`, `src/app/admin/2fa/page.tsx`

- [ ] **Session rotation** — Rotation du token de session après actions sensibles
  - Fichiers : `src/lib/auth/session.ts`

### Étape 1.2 : API Resilience
- [ ] **Pagination systématique** — `take: 50` par défaut + cursor-based sur tous les `findMany`
  - Routes concernées : `/api/cockpit-chats`, `/api/backtest/run`, dashboard loaders
  - Fichiers : `src/app/api/cockpit-chats/route.ts`, `src/lib/data/dashboard.ts`, `src/lib/data/portfolio.ts`

- [ ] **Multisig distributions persisté** — Remplacer le `Map` en mémoire par une table DB
  - DB : `DistributionApproval` model (signer, signature, timestamp, expiration)
  - Fichiers : `prisma/schema.prisma`, `src/app/admin/distributions/actions.ts`

- [ ] **Health check endpoint** — `/api/health` (DB + Redis + external services)
  - Fichiers : `src/app/api/health/route.ts`

### Étape 1.3 : Testing & Quality
- [ ] **Tests E2E Playwright** — Couvrir les flux critiques (login, invest, admin actions)
  - Fichiers : `e2e/auth.spec.ts`, `e2e/invest.spec.ts`, `e2e/admin.spec.ts`

- [ ] **Tests UI React Testing Library** — Composants critiques (Button, Modal, dashboard)
  - Fichiers : `src/components/ui/__tests__/button.test.tsx`, `src/components/ui/__tests__/modal.test.tsx`

- [ ] **Pre-commit hooks** — Husky + lint-staged
  - Fichiers : `.husky/pre-commit`, `package.json`

### Étape 1.4 : Environments
- [ ] **Staging environment** — Preview Vercel par branche
  - Fichiers : `.github/workflows/staging.yml`

---

## 🔷 VOLET 2 — Smart Contracts Mainnet (P0)

**Objectif** : Déployer les contrats sur Base mainnet de manière sécurisée.

### Étape 2.1 : Audit Preparation
- [ ] **Spearbit audit kickoff** — Finaliser la documentation d'audit
  - Fichiers : `docs/audit/spearbit-kickoff.md`, contrats complets + tests

- [ ] **Formal verification** (optionnel) — Certora ou equivalent sur `HearstYieldVault`

### Étape 2.2 : Contract Hardening
- [ ] **ReentrancyGuard** — Ajouter `nonReentrant` sur `deposit`/`withdraw`
  - Fichiers : `contracts/src/HearstYieldVault.sol`

- [ ] **Pausable** — Implémenter `Pausable` avec rôle GUARDIAN
  - Fichiers : `contracts/src/HearstYieldVault.sol`

- [ ] **Timelock + AccessControl** — Remplacer `Ownable` par `AccessControl` + timelock
  - Fichiers : `contracts/src/HearstYieldVault.sol`, `contracts/src/PoRRegistry.sol`

### Étape 2.3 : Mainnet Deployment
- [ ] **Deploy script** — Script Foundry pour mainnet avec verification
  - Fichiers : `contracts/script/DeployMainnet.s.sol`

- [ ] **Post-deploy verification** — Vérifier les paramètres (minDeposit, owner, asset)

---

## 🔷 VOLET 3 — Share Classes & LP Portal (P1)

**Objectif** : Implémenter les share classes et le portail LP (features V1 roadmap).

### Étape 3.1 : Share Classes
- [ ] **DB Schema** — Ajouter `ShareClass` model lié à `VaultDeployment`
  - Fichiers : `prisma/schema.prisma`

- [ ] **Engine** — Utiliser `src/lib/engine/share-class.ts` (déjà implémenté)
  - Share Class A : $250k/60d/1+10
  - Share Class B : $1M/90d/0.75+8

- [ ] **UI Admin** — CRUD share classes dans `/admin/vaults/[id]/share-classes`
  - Fichiers : `src/app/admin/vaults/[id]/share-classes/page.tsx`

- [ ] **UI Invest** — Sélecteur de share class lors du invest
  - Fichiers : `src/app/(product)/vaults/[id]/invest/page.tsx`

### Étape 3.2 : LP Portal (Read-Only)
- [ ] **Page LP** — `/lp` ou `/portal` avec P&L personnel, distributions, documents
  - Fichiers : `src/app/lp/page.tsx`, `src/app/lp/layout.tsx`

- [ ] **API LP** — Routes `/api/lp/positions`, `/api/lp/distributions`, `/api/lp/documents`
  - Fichiers : `src/app/api/lp/positions/route.ts`, etc.

- [ ] **Auth LP** — Auth simplifiée (magic link) sans accès admin
  - Fichiers : `src/lib/auth/lp-auth.ts`

### Étape 3.3 : KYC/Persona Integration
- [ ] **Persona SDK** — Intégrer Persona pour KYC/KYB workflow
  - Fichiers : `src/lib/kyc/persona.ts`, `src/app/(product)/profile/kyc/page.tsx`

- [ ] **KYC status sync** — Webhook Persona → mise à jour `Investor.kycStatus`
  - Fichiers : `src/app/api/webhooks/persona/route.ts`

### Étape 3.4 : Fireblocks Custody
- [ ] **Fireblocks SDK** — Intégration pour vault custody
  - Fichiers : `src/lib/custody/fireblocks.ts`

---

## 🔷 VOLET 4 — Performance & Observabilité (P1)

**Objectif** : Scaler l'application pour supporter la croissance.

### Étape 4.1 : Caching
- [ ] **Redis caching** — Cache des données dashboard/vault (TTL 5-15 min)
  - Fichiers : `src/lib/cache.ts`

- [ ] **SWR/React Query** — Client-side caching pour les requêtes API
  - Fichiers : `src/hooks/use-dashboard.ts`, `src/hooks/use-vault.ts`

### Étape 4.2 : Frontend Performance
- [ ] **Code splitting** — `next/dynamic` sur les gros composants
  - Fichiers : `src/app/(product)/portfolio/page.tsx`, `src/app/admin/scenario-lab/page.tsx`

- [ ] **Lazy loading images** — `next/image` pour les logos et assets
  - Fichiers : `public/logos/`, composants concernés

### Étape 4.3 : Observabilité
- [ ] **Prometheus metrics** — Latence API, taux d'erreur, DB connections
  - Fichiers : `src/lib/metrics.ts`, `src/app/api/metrics/route.ts`

- [ ] **Alerting** — Seuils sur erreurs 500, rate limiting, latence
  - Fichiers : `.github/workflows/alerting.yml` (ou intégration Datadog/PagerDuty)

- [ ] **Distributed tracing** — OpenTelemetry pour suivre les requêtes
  - Fichiers : `src/lib/tracing.ts`

---

## 📊 Matrice de Priorité

| Priorité | Volet | Étape | Impact | Effort | Dépendances |
|----------|-------|-------|--------|--------|-------------|
| **P0** | 1 | 1.1 2FA/TOTP | 🔴 Critique | 3j | — |
| **P0** | 1 | 1.2 Pagination | 🔴 Critique | 2j | — |
| **P0** | 1 | 1.2 Multisig persisté | 🔴 Critique | 3j | — |
| **P0** | 2 | 2.1 Audit kickoff | 🔴 Critique | 5j | — |
| **P0** | 2 | 2.2 ReentrancyGuard | 🔴 Critique | 1j | — |
| **P0** | 2 | 2.2 Pausable | 🟠 Haut | 2j | — |
| **P1** | 1 | 1.3 Tests E2E | 🟠 Haut | 5j | — |
| **P1** | 1 | 1.4 Staging | 🟠 Haut | 2j | — |
| **P1** | 3 | 3.1 Share Classes | 🟠 Haut | 4j | — |
| **P1** | 3 | 3.2 LP Portal | 🟠 Haut | 5j | 3.1 |
| **P1** | 3 | 3.3 KYC Persona | 🟠 Haut | 4j | — |
| **P1** | 4 | 4.1 Redis caching | 🟡 Moyen | 3j | — |
| **P1** | 4 | 4.2 Code splitting | 🟡 Moyen | 2j | — |
| **P2** | 4 | 4.3 Observabilité | 🟡 Moyen | 5j | — |
| **P2** | 3 | 3.4 Fireblocks | 🟢 Bas | 3j | 3.1 |

---

## 🏗️ Architecture Cible V1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Next.js   │  │  LP Portal  │  │  Admin UI   │  │  Cockpit Shell      │ │
│  │   (App)     │  │  (read-only)│  │             │  │  (@hearst/cockpit)  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                    │            │
│         └────────────────┴────────────────┴────────────────────┘            │
│                                    │                                        │
│                              SWR / React Query                              │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                              API LAYER                                       │
│                                    │                                        │
│  ┌─────────────────────────────────┼─────────────────────────────────────┐  │
│  │         Next.js API Routes      │     Server Actions                  │  │
│  │  ┌─────────┐ ┌─────────┐       │  ┌─────────┐ ┌─────────┐           │  │
│  │  │ /api/*  │ │ /health │       │  │ admin/* │ │ invest  │           │  │
│  │  └────┬────┘ └────┬────┘       │  └────┬────┘ └────┬────┘           │  │
│  └───────┼───────────┼────────────┘───────┼───────────┼────────────────┘  │
│          │           │                    │           │                    │
│  ┌───────┴───────────┴────────────────────┴───────────┴────────────────┐   │
│  │                         Rate Limiting + Auth                         │   │
│  └─────────────────────────────────┬────────────────────────────────────┘   │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                           SERVICE LAYER                                      │
│                                    │                                        │
│  ┌─────────────┐  ┌─────────────┐ │  ┌─────────────┐  ┌─────────────────┐  │
│  │   Prisma    │  │    Redis    │ │  │   Inngest   │  │  External APIs  │  │
│  │  (Postgres) │  │  (Cache/RL) │ │  │  (Jobs)     │  │  (Persona, etc) │  │
│  └─────────────┘  └─────────────┘ │  └─────────────┘  └─────────────────┘  │
│                                    │                                        │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
┌────────────────────────────────────┼────────────────────────────────────────┐
│                         BLOCKCHAIN LAYER                                     │
│                                    │                                        │
│  ┌─────────────────────────────────┴────────────────────────────────────┐   │
│  │                         Base Mainnet                                  │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐   │   │
│  │  │ HearstYieldVault│  │  PoRRegistry    │  │   EventLogger       │   │   │
│  │  │   (ERC-4626)    │  │  (attestations) │  │  (events on-chain)  │   │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────┘   │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist de Vérification V1

### Sécurité
- [ ] 2FA/TOTP obligatoire pour admin
- [ ] Rate limiting sur toutes les routes sensibles
- [ ] Pagination sur toutes les listes
- [ ] Multisig distributions persisté en DB
- [ ] Health check endpoint fonctionnel
- [ ] Pas de secrets dans les logs
- [ ] Session rotation après actions sensibles

### Smart Contracts
- [ ] Audit Spearbit complété + remédiation
- [ ] ReentrancyGuard sur deposit/withdraw
- [ ] Pausable avec rôle GUARDIAN
- [ ] Timelock + AccessControl (pas de Ownable simple)
- [ ] Déployé et vérifié sur Base mainnet

### Features V1
- [ ] Share Class A et B fonctionnelles
- [ ] LP Portal accessible avec auth simplifiée
- [ ] KYC Persona intégré
- [ ] Fireblocks custody configuré

### Performance
- [ ] Redis caching sur dashboard/vault
- [ ] Code splitting sur les pages lourdes
- [ ] Pagination DB sur toutes les listes
- [ ] Temps de chargement initial < 2s

### Tests
- [ ] Tests E2E Playwright sur les flux critiques
- [ ] Tests UI React Testing Library
- [ ] Tests d'intégration DB "vraie"
- [ ] Couverture > 70%

### Observabilité
- [ ] Metrics Prometheus exposées
- [ ] Alerting configuré
- [ ] Logs structurés sans PII
- [ ] Dashboard de monitoring

### DevOps
- [ ] Staging environment fonctionnel
- [ ] CI/CD complet (lint → test → build → deploy)
- [ ] Pre-commit hooks
- [ ] Documentation API (OpenAPI)

---

## 🚀 Prochaine Action Immédiate

```bash
# Commencer par le Volet 1 — Étape 1.1 : 2FA/TOTP
# C'est la feature de sécurité la plus critique pour la production.

pnpm add speakeasy qrcode
# ou
pnpm add otpauth qrcode

# Puis créer :
# 1. prisma/schema.prisma — ajouter totpSecret à User
# 2. src/lib/auth/totp.ts — génération/validation TOTP
# 3. src/app/admin/2fa/page.tsx — setup UI
# 4. src/lib/auth/require-auth.ts — vérification TOTP pour admin
```

---

*Plan généré le 2026-05-23. À valider par Adrien avant exécution.*
