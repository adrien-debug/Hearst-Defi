# 09 — Frontière mock ↔ live (pré-Spearbit, pré-mainnet)

> Audit read-only, périmètre : tout `src/lib/{mock,attestation,chain,demo,data}/` + consommateurs (`src/app/`, `src/components/`, `prisma/seed.ts`, `src/lib/inngest/`).
> Date : 2026-05-26. Aucune modification de code.

---

## Résumé exécutif

Bonne nouvelle d'abord : **aucun module `src/lib/mock/*` n'est consommé pour ses *valeurs* en runtime**. Les trois fichiers (`dashboard.ts`, `proof-center.ts`, `investor-memo.ts`) ne sont importés qu'en `import type`, par `src/lib/data/proofs.ts`, `src/lib/demo/fixtures.ts`, deux composants UI, et un test PDF. Le seul usage *valeur* de `getMockMemoInput` reste dans `src/lib/pdf/__tests__/memo-template.test.ts` (test, jamais bundlé).

Le risque réel n'est donc pas "un mock importé directement en page produit" — il a déjà été nettoyé. Le risque réel se concentre sur **trois zones grises** :

1. **Demo mode** (`src/lib/demo/*`) — basculé par `DEMO_MODE_DEFAULT=1` (env, forcé global) ou cookie `hearst-demo-mode=1` (cookie honoré uniquement quand l'env est aussi à 1). C'est propre côté défense en profondeur. Mais les fixtures émettent `source: "db"`, `stale: false`, `livePreview: false` — donc les composants downstream qui dérivent un badge depuis ces champs (`data.source === "fallback" ? "estimated" : "live"`) **rendront « Live » sur la donnée démo**. C'est exactement le scénario du brief.
2. **Mock attestor key** (`src/lib/attestation/__mocks__/mock-key.ts`) — clé Anvil publique. Utilisée par `prisma/seed.ts` pour générer des `Proof.signature` réellement vérifiables ; la chaîne de vérification (`verifyStoredAttestation`) fonctionne mais ne sait pas distinguer « signé par l'attestor de prod » de « signé par la clé de test Anvil ». **Pas de variable d'allowlist d'attestor en prod.**
3. **Fallbacks silencieux dans `src/lib/data/*`** — `dashboard.ts`, `risk-framework.ts`, `vaults.ts`, `portfolio.ts`, `custody.ts`, `hashprice.ts`, `btc-price.ts`, `fear-greed.ts`, `defillama.ts`, `history.ts` : tous renvoient un objet "valid-looking" si Prisma est vide ou si l'API externe casse. La discipline est bonne (chacun expose `source`, `stale`, ou un provenance dédié) — **mais la rigueur côté UI est inégale** : seuls quelques composants pluggent `source === "fallback"` sur le badge.

PoR onchain (`fetchOnChainAttestations`) : implémentation correcte (viem, never-throw, retour `[]` si l'adresse n'est pas configurée). Aucun mock JSON masqué.

Smart contracts Phase 2 (`EventLogger`, `PoRRegistry`) écrits + tests Foundry, déployables Base Sepolia. **Aucun déploiement mainnet** — gated par audit Spearbit. `HearstYieldVault.sol` existe mais n'est pas mentionné dans `contracts/README.md` (qui parle d'un Phase 3 futur). À vérifier qu'il n'est pas déployable accidentellement.

---

## Table : surface × source × badge attendu

| Surface produit (route) | Loader effectif | Classification | Provenance attendue | Réalité en prod |
|---|---|---|---|---|
| `/admin/dashboard` (hero AUM/APY/risque) | `loadDashboardData` via `lib/demo/loaders` → `lib/data/dashboard.ts` | HYBRID (DB + fallbacks numériques par section) | Live si Prisma peuplé, Estimated sinon, Manual pour secteurs | OK quand DB peuplée. **Si DB vide, certains badges en dur disent "live" alors que la valeur est un `FALLBACK_*`** (ex. `hashpriceTrendPct = -3.4` constante). |
| `/admin/dashboard` (timeseries 30j) | `lib/data/dashboard.ts#loadDashboardTimeseries` | HYBRID | Live ou Estimated selon `source` | ✅ `timeseries-section.tsx` mappe `source === "fallback" ? "estimated" : "live"`. |
| `/admin/cockpit` (Hero strip 6 KPIs) | `lib/data/cockpit.ts#buildHeroKpis` | LIVE (Prisma) avec fallback "manual" si rows manquants | Live / Estimated / Manual / Stale | ✅ provenance calculée par KPI, badge fidèle. |
| `/(product)/portfolio` (KPI / positions / activité) | `loadPortfolio` via `lib/demo/loaders` → `lib/data/portfolio.ts` | HYBRID (LIVE si investor connecté, fallback "no data" sinon) | Live / Stale | OK quand investor signed in. **En démo mode, fixtures retournent `source: "live"` (cf. fixture P 501) — provenance "live" affichée alors qu'il s'agit du fixture.** |
| `/(product)/portfolio/[positionId]` (détail position) | `loadPosition` directement depuis `lib/data/portfolio.ts` (PAS le wrapper démo) | LIVE | Live | ⚠️ **Incohérence demo** : la liste passe par `lib/demo/loaders`, le détail bypass. Un LP en démo voit un portfolio fixture en liste, puis 404 au clic. |
| `/(product)/vaults` (catalogue) | `listVaults` via `lib/demo/loaders` → `lib/data/vaults.ts` | HYBRID (Prisma + 3 fixtures inline si DB vide) | Live / Estimated | ⚠️ Quand `prisma.vaultDeployment` est vide, `FIXTURE_VAULTS` (3 vaults inline avec `currentAumUsdc: 42_500_000`) sont retournés. Aucun champ `provenance` exposé — l'UI affiche le ticker sans badge "fixture". |
| `/(product)/vaults/[id]` (fiche vault) | `getVault` via `lib/demo/loaders` → `lib/data/vaults.ts` | HYBRID | Live / Estimated | Idem : fallback fixture silencieux. |
| `/(product)/vaults/[id]/invest` (wizard) | `getVault` via `lib/demo/loaders` | HYBRID | Live / Estimated | Idem. **Critique** : un wizard de souscription qui renvoie des chiffres fixture sans badge est exactement le scénario interdit (CLAUDE.md non-négociable #10). |
| `/(product)/proof-center` | `fetchOnChainEvents`, `fetchOnChainAttestations`, `getProofs` (wrapper démo) | LIVE (chain) + LIVE (Prisma proofs) | Attested / Live | ✅ Si `NEXT_PUBLIC_POR_REGISTRY_ADDRESS` configuré → vrai onchain. Sinon `[]` → l'UI le voit via `chainConfigured = false`. |
| `/admin/proof-center` | Idem | LIVE | Attested / Live | ✅ |
| `/admin/scenario-lab` (engine) | `lib/engine/*` (pur, jamais I/O) | LIVE (déterministe sur inputs Prisma) | Estimated | ✅ |
| `/(product)/proof-center` PoR custody | `loadCustody` (Fireblocks SDK) | HYBRID (Live si keys + secret path présents, sinon `manual` fallback) | Live / Manual | ✅ `provenance` retourné par le loader, propagé jusqu'au composant. |
| `hashprice` (déchet dashboard + agents) | `fetchHashprice` via `lib/demo/loaders` | LIVE (mempool.space + Coingecko), fallback `stale: true` | Live / Stale / Estimated | ✅ Composants checkent `stale`. |
| `btc-price` | `fetchBtcPrice` (Coingecko) | LIVE, fallback `usd:0, stale:true` | Live / Stale | ✅ |
| `fear-greed` | `lib/data/fear-greed.ts` | LIVE, fallback `value:50 stale:true source:fallback` | Live / Estimated | ✅ |
| `defillama` (yields) | `lib/data/defillama.ts` | LIVE, fallback `FALLBACK_TOP_YIELDS` | Live / Estimated | ✅ |
| `risk-framework` | `lib/data/risk-framework.ts` via `lib/demo/loaders` | HYBRID (`FALLBACK_INPUTS` si rows manquantes, expose `source`) | Live / Estimated | ✅ propagé. |
| `advanced-metrics` | `lib/data/advanced-metrics.ts` via `lib/demo/loaders` | HYBRID — détecte le pattern "synthetic" (`apy_low=9.0 && apy_high=13.0`) | Estimated si synthetic | ✅ `looksSynthetic()` est élégant. |
| `vault monthly history` | `lib/agents/loaders/vault.ts#loadVaultMonthlyHistory` | HYBRID (pad les mois manquants avec valeurs déterministes) | n/a (consommé par advanced-metrics qui détecte le pattern) | OK chain : seul `advanced-metrics` consomme → le badge dérive de `looksSynthetic`. |
| Investor memo PDF (`/admin/investor-memo`) | `lib/agents/investor-memo.ts` | LIVE (agents) — `getMockMemoInput` n'est utilisé que par le test PDF | Estimated (agent output) | ✅ Production utilise vraiment Kimi. |
| Proof Center cartes "paper" | `getProofs` (Prisma) wrappé démo | LIVE | Attested si signature valide, sinon non-vérifié | ✅ `attestationVerified` calculé par `verifyStoredAttestation` à chaque lecture. |

---

## Inventaire détaillé

### `src/lib/mock/` — 3 fichiers (486 LoC)

| Fichier | Rôle | Consommateurs valeurs (runtime) | Consommateurs types | Verdict |
|---|---|---|---|---|
| `dashboard.ts` (95 LoC) | Types `ProvenanceBadge`-tagged + shape `DashboardSnapshot`. Aucune fonction. | — | `src/components/dashboard/mining-health.tsx` (type `MiningHealth`) | OK : pas de valeur exportée. |
| `investor-memo.ts` (259 LoC) | `getMockMemoInput()` + scenarios/backtests en dur | `src/lib/pdf/__tests__/memo-template.test.ts` (test uniquement) | `src/lib/agents/loaders/distribution.ts` (commentaire) | OK : aucun import valeur en prod. **À déplacer dans `__tests__/fixtures/` pour clarifier l'intention.** |
| `proof-center.ts` (132 LoC) | `getProofs()` retournant `PROOFS: ProofItem[]` (8 entrées hardcoded) | — | `src/components/proof/proof-types.ts`, `proof-card.tsx`, `src/lib/data/proofs.ts`, `src/lib/demo/fixtures.ts` | OK : `data/proofs.ts` lit Prisma, n'utilise QUE le type. La fonction `getProofs()` du mock n'est jamais appelée. **Risque latent** : un dev pourrait ré-importer `getProofs` depuis `@/lib/mock/proof-center` au lieu de `@/lib/data/proofs`. Pas de garde lint. |

### `src/lib/attestation/` (419 LoC)

| Fichier | Rôle | Verdict |
|---|---|---|
| `canonical.ts` | Canonicalisation JSON (ordre des clés) + `digestOf()` keccak256 | Pur. OK. |
| `sign.ts` | EIP-191 `signAttestation` (viem) | Pur. OK. |
| `verify.ts` | Re-derive digest, recover signer, compare à `payload.attestor` | Pur. OK. |
| `stored.ts` | `verifyStoredAttestation(row)` — vérifie un row Prisma `Proof` | LIVE. Appelé par `lib/data/proofs.ts` à chaque lecture. ✅ |
| `mock.ts` | `buildMockAttestation()`, `signMockAttestation()`, `MOCK_ATTESTOR_ADDRESS` | **Utilisé en runtime UNIQUEMENT par `prisma/seed.ts`**. Pas par les routes. |
| `__mocks__/mock-key.ts` | Clé privée Anvil bien connue | **Importé par `mock.ts` et `__tests__/`**. Ne quitte jamais le seed/tests. |

**Trou identifié** : `verifyStoredAttestation` valide la signature, mais ne vérifie pas que `signer` ∈ allowlist d'attestors autorisés. Conséquence : si un attaquant insère un `Proof` row signé par n'importe quelle clé (y compris la clé Anvil publique), l'UI affichera `attestationVerified: true`. **Il faut un check `signer === HEARST_TRUSTED_ATTESTOR` (env) pour les vraies attestations mining.**

### `src/lib/chain/` (382 LoC)

| Fichier | Rôle | Verdict |
|---|---|---|
| `client.ts` | viem `PublicClient` (Base Sepolia), addresses depuis env, `isChainConfigured()` | LIVE. ✅ default RPC fallback `sepolia.base.org`. |
| `event-logger.ts` | `fetchOnChainEvents()` — lit logs `HearstEvent`, **filtre par `HEARST_PUBLISHER`** | LIVE. ✅ Never-throws (warn + return `[]`). Filtrage publisher correct. |
| `por-registry.ts` | `fetchOnChainAttestations()` — lit logs `AttestationPublished` | LIVE. ✅ Never-throws. **Pas de filtrage attestor** (juste l'adresse contrat) — c'est OK car le contrat lui-même garde un publisher unique, mais à confirmer après audit. |
| `abis.ts` | ABIs littéraux | OK. |

**Conclusion PoR onchain** : aucun mock JSON. Si l'adresse `NEXT_PUBLIC_POR_REGISTRY_ADDRESS` est vide → retour `[]`, l'UI affiche `chainConfigured = false`. Si l'adresse est configurée mais RPC down → warn + `[]` (graceful). C'est propre.

### `src/lib/demo/` (951 LoC)

| Fichier | Rôle | Verdict |
|---|---|---|
| `index.ts` | `isDemoMode()` — gated par `DEMO_MODE_DEFAULT=1` AND cookie | ✅ Défense en profondeur correcte. |
| `loaders.ts` | Wrappers `withDemoFallback` pour 9 loaders | ✅ Sauf `loadPosition` côté `/portfolio/[positionId]` qui bypass (P1). |
| `fixtures.ts` (731 LoC) | Tous les fixtures hardcoded | ⚠️ **Champs `source: "live"` / `"db"` et `stale: false` codés en dur** dans les fixtures (lignes 144, 159, 365, 427, 501, 636). |
| `projection.ts` | Helpers maths purs (Client Component safe) | OK, pas de mock data. |

### `src/lib/data/` — classification ligne par ligne

| Fichier | LoC | Classification | Détail |
|---|---|---|---|
| `advanced-metrics.ts` | 142 | HYBRID | `looksSynthetic()` détecte le padding `apy_low=9.0/13.0` de `loadVaultMonthlyHistory` — propre. |
| `backfill.ts` | 110 | LIVE | Helper Prisma `createMany`. |
| `btc-price.ts` | 51 | HYBRID | Coingecko + fallback `usd:0 stale:true`. |
| `cockpit.ts` | 554 | LIVE | Prisma uniquement, fallback "manual"/"stale" déclaré dans le badge. |
| `custody-aggregate.ts` | 68 | Pure (no I/O) | Aggregation Fireblocks. |
| `custody.ts` | 86 | HYBRID | Fireblocks live + `manualFallback()` si keys absentes ou exception. `provenance` propagé. |
| `customers.ts` | 109 | LIVE | Prisma. |
| `dashboard.ts` | 699 | HYBRID | Plusieurs `FALLBACK_*` constantes (hashprice trend, ops confidence) injectées sans `provenance: "estimated"` au niveau du champ. |
| `defillama.ts` | 296 | HYBRID | `FALLBACK_APY_PCT=4.5` + `FALLBACK_TOP_YIELDS`, `source` exposé. |
| `fear-greed.ts` | 217 | HYBRID | `source: "fallback"` exposé. |
| `hashprice.ts` | 163 | HYBRID | `FALLBACK_USD_PER_TH_DAY=0.055` + `stale: true`. |
| `history.ts` | 281 | HYBRID | `syntheticBtcSeries()` + `syntheticDifficultySeries()` utilisés en fallback. |
| `monitoring.ts` | 71 | LIVE | Prisma aggregates. |
| `portfolio.ts` | 546 | HYBRID | `source: "fallback"` si pas d'investor ; widget loaders renvoient `source: "stale"`. |
| `proofs.ts` | 92 | LIVE | Prisma + vérification cryptographique. |
| `risk-framework.ts` | 334 | HYBRID | `FALLBACK_INPUTS` + `source: "fallback"` exposé. |
| `time-to-cash.ts` | 63 | LIVE/Pure | Calc lock-up. |
| `vaults.ts` | 303 | HYBRID | **`FIXTURE_VAULTS` (3 vaults inline) renvoyés silencieusement si `vaultDeployment` est vide.** Aucun champ `provenance`. |

### Smart contracts (`contracts/`)

| Contrat | Statut écrit | Statut testnet | Statut mainnet | Verdict |
|---|---|---|---|---|
| `EventLogger.sol` | ✅ écrit + Foundry tests | Déployable Base Sepolia (`script/DeployBaseSepolia.s.sol`) | ❌ NON déployé (lockés par CLAUDE.md #8 + ADR-006) | OK Phase 2. |
| `PoRRegistry.sol` | ✅ écrit + tests | Déployable Base Sepolia | ❌ NON déployé | OK Phase 2. |
| `HearstYieldVault.sol` | ✅ écrit + `script/DeployHearstYieldVault.s.sol` | Déployable Base Sepolia | ❌ NON déployé | **Pas mentionné dans `contracts/README.md`** (qui parle d'un Phase 3 futur `Vault.sol`). À vérifier que ce fichier est bien le draft Phase 3, non audité, et qu'il ne peut pas être promu mainnet par mégarde. |

---

## Findings

### P0 — risque de fuite mock → LP en prod

**P0-1 — Fixtures démo se présentent comme "live" / "db" sur le wire**
- Fichier : `src/lib/demo/fixtures.ts` lignes 144, 159, 354, 365, 427, 501, 636.
- Détail : `DEMO_HASHPRICE.stale = false`, `DEMO_DASHBOARD_DATA.source = "db"`, `DEMO_DASHBOARD_DATA.vaultMeta.livePreview = false`, `DEMO_RISK_FRAMEWORK.source = "db"`, `DEMO_PORTFOLIO_DATA.source = "live"`.
- Conséquence : tout composant qui dérive son badge depuis `source === "fallback" ? "estimated" : "live"` (ex. `src/components/dashboard/timeseries-section.tsx:17`) **affichera "Live" pour de la donnée démo**. Si `DEMO_MODE_DEFAULT=1` est laissé à 1 sur Vercel, ou si un LP active accidentellement le cookie sur le déploiement principal, il voit des chiffres fixture badgés Live.
- Atténuation existante : `isDemoMode()` n'honore le cookie QUE si l'env est aussi à 1, donc un cookie tout seul ne suffit pas. Le risque est qu'on oublie `DEMO_MODE_DEFAULT=1` côté env d'un déploiement "production-like" (preview Vercel).
- **À débrancher avant mainnet** : forcer `source: "fallback"` / `stale: true` dans toutes les fixtures démo, et ajouter un assert au build (`fixtures.ts:DEMO_DASHBOARD_DATA.source !== "db"`).

**P0-2 — `verifyStoredAttestation` ne vérifie pas que `signer` ∈ allowlist d'attestors prod**
- Fichier : `src/lib/attestation/stored.ts` lignes 75-103.
- Détail : la vérif crypto valide que la sig provient bien de `payload.attestor` ET que `signer` du row Prisma matche le recovered. Mais elle ne vérifie pas que `signer` est l'attestor *autorisé*. Le seed prod (s'il est lancé en prod par erreur, ou si un admin crée un `Proof` row à la main) peut donc faire passer une attestation signée par la clé Anvil publique pour valide.
- **À débrancher avant mainnet** :
  - Ajouter un env `HEARST_TRUSTED_ATTESTORS` (CSV d'adresses) et le check dans `verifyStoredAttestation`.
  - Bloquer `prisma/seed.ts` en prod (`if (process.env.NODE_ENV === "production") throw`).

### P1 — incohérences à corriger avant audit Spearbit

**P1-1 — `/portfolio/[positionId]` bypass le wrapper démo**
- Fichier : `src/app/(product)/portfolio/[positionId]/page.tsx:9` importe `loadPosition` depuis `@/lib/data/portfolio` au lieu de `@/lib/demo/loaders`.
- Conséquence : la liste portfolio affiche des positions fixture, mais cliquer dessus tape Prisma → 404 / mauvaise position. Cohérence UX cassée en démo.
- Fix : changer l'import en `@/lib/demo/loaders`.

**P1-2 — `lib/data/vaults.ts` renvoie 3 vaults fixture silencieusement**
- Fichier : `src/lib/data/vaults.ts:218-242` (et `:254-303`).
- Détail : Si `prisma.vaultDeployment.findMany()` est vide, retour de `FIXTURE_VAULTS` (HYV-A $42.5M AUM hardcoded, plus Defensive et BTC Plus). Aucun champ `provenance` exposé.
- Conséquence : à fresh deploy, `/vaults` affiche 3 vaults qui *paraissent* live avec un AUM crédible. Wizard de souscription `/vaults/[id]/invest` consomme ces chiffres. C'est le scénario CLAUDE.md non-négociable #10 violé.
- Fix : ajouter `provenance: "estimated"` (ou un flag `isFixture: true`) sur `VaultProduct` et bannir l'affichage du wizard quand cette flag est positive.

**P1-3 — `dashboard.ts` injecte des constantes `FALLBACK_*` sans badge dédié**
- Fichier : `src/lib/data/dashboard.ts:180-181` (`FALLBACK_HASHPRICE_TREND_PCT = -3.4`, `FALLBACK_OPERATIONAL_CONFIDENCE = 81`) consommés ligne 348-350.
- Détail : Si pas de `MiningMetric` row, ces deux KPI affichent quand même -3.4% / 81 sans signaler que c'est un fallback.
- Fix : exposer un `provenance` par champ ou retourner `null` quand fallback (et laisser le composant afficher "—").

**P1-4 — Pas de banner "DEMO MODE" UI**
- Fichier : `src/components/demo/demo-mode-toggle.tsx` est un simple bouton "Démo" dans le header admin (`src/app/admin/layout.tsx:90`). Pas de banner full-width qui signale "Vous voyez des données fictives".
- Conséquence : un admin qui active la démo, prend un screenshot pour un investor, puis oublie de désactiver → l'investor voit le screenshot et croit que c'est live.
- Fix : afficher un banner sticky orange sur tout layout produit quand `isDemoMode() === true`.

### P2 — durcissement

**P2-1 — `MOCK_ATTESTOR_PRIVATE_KEY` exporté sans guard prod**
- Fichier : `src/lib/attestation/__mocks__/mock-key.ts`.
- Détail : Le commentaire dit "MOCK ONLY — must never touch mainnet" mais rien n'empêche techniquement `signMockAttestation` d'être appelé en prod (il est juste tree-shaken si pas appelé). Si un agent / cron import incorrectement `signMockAttestation` → on signe des Proof rows en prod avec la clé Anvil.
- Fix : `if (process.env.NODE_ENV === "production") throw` au top de `mock.ts`.

**P2-2 — `getProofs` dans `src/lib/mock/proof-center.ts` est dead code mais ré-exportable**
- Fichier : `src/lib/mock/proof-center.ts:130-132`.
- Fix : supprimer la fonction (garder uniquement les types) ou déplacer le module dans `src/lib/data/proofs-types.ts`.

**P2-3 — `getMockMemoInput` même remarque**
- Fichier : `src/lib/mock/investor-memo.ts:241-259`.
- Fix : déplacer dans `src/lib/pdf/__tests__/fixtures/`.

**P2-4 — `HearstYieldVault.sol` non documenté dans le README**
- Fichier : `contracts/README.md`.
- Détail : Le README parle d'un futur Phase 3 `Vault.sol`, mais `HearstYieldVault.sol` + `DeployHearstYieldVault.s.sol` sont déjà au repo. Risque qu'un dev croie que c'est audité.
- Fix : section README "Phase 3 (draft, NON audité)" listant `HearstYieldVault.sol` + interdiction de déploiement.

**P2-5 — Pas de garde-fou contre import direct de `@/lib/mock/*` valeurs**
- Fix : règle ESLint custom `no-restricted-imports` qui bloque l'import non-type depuis `@/lib/mock/*`.

---

## Recommandations — quoi débrancher avant mainnet (checklist)

| # | Action | Fichier(s) | Sévérité |
|---|---|---|---|
| 1 | Forcer `source: "fallback"` + `stale: true` dans toutes les fixtures démo, et faire échouer un test si un champ `source === "db"` ou `"live"` apparaît dans `DEMO_*` | `src/lib/demo/fixtures.ts` + nouveau test | P0 |
| 2 | Banner "DEMO MODE — fictitious data" sur tous les layouts (admin + product) quand `isDemoMode()` est true | nouveau `<DemoBanner />` dans `src/app/(product)/layout.tsx` et `src/app/admin/layout.tsx` | P0 |
| 3 | Ajouter `HEARST_TRUSTED_ATTESTORS` env, vérifier dans `verifyStoredAttestation` que `signer ∈ allowlist` | `src/lib/attestation/stored.ts` + `src/lib/env.ts` | P0 |
| 4 | Bloquer `prisma/seed.ts` en prod (`if NODE_ENV === "production" throw`) | `prisma/seed.ts` | P0 |
| 5 | `if (process.env.NODE_ENV === "production") throw` au top de `src/lib/attestation/mock.ts` | mock.ts | P0/P1 |
| 6 | Corriger l'import de `loadPosition` dans `/portfolio/[positionId]/page.tsx` pour passer par `@/lib/demo/loaders` | page | P1 |
| 7 | Exposer `provenance: "estimated"` sur les 3 `VaultProduct` du `FIXTURE_VAULTS` retournés quand DB vide ; bloquer le wizard `/vaults/[id]/invest` si `provenance !== "live"` | `src/lib/data/vaults.ts` + wizard | P1 |
| 8 | Retirer `FALLBACK_HASHPRICE_TREND_PCT` et `FALLBACK_OPERATIONAL_CONFIDENCE` ; quand pas de `MiningMetric`, retourner `null` et afficher "—" avec badge `Stale` | `src/lib/data/dashboard.ts` | P1 |
| 9 | Règle ESLint `no-restricted-imports` interdisant les imports non-type depuis `@/lib/mock/*` | `eslint.config.mjs` | P2 |
| 10 | Déplacer `getMockMemoInput` / `getProofs` (mock) vers `__tests__/fixtures/`, supprimer le module `src/lib/mock/proof-center.ts` (garder un `src/types/proof.ts` pour les types) | `src/lib/mock/*` | P2 |
| 11 | Documenter `HearstYieldVault.sol` comme "Phase 3 draft NON AUDITÉ — ne pas déployer" dans `contracts/README.md`, et faire échouer `DeployHearstYieldVault.s.sol` si la chain id est mainnet | `contracts/README.md` + script Solidity | P2 |

---

## Bilan

11 findings (2 P0, 4 P1, 5 P2). Les mocks valeurs n'ont pas fuité dans des routes produit ; le vrai risque est ailleurs : (a) le **demo mode** rend `source: "db"` sur les fixtures, donc affiche Live pour des chiffres fictifs si l'env est mal cadré, et (b) `lib/data/vaults.ts` retourne 3 vaults fixture avec AUM hardcoded $42.5M sans badge quand la DB est vide — exactement ce qu'un wizard de souscription ne doit jamais consommer. À débrancher avant Spearbit.
