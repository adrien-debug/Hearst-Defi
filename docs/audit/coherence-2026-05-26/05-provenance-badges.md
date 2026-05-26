# Audit — Cohérence Provenance Badges

**Date** : 2026-05-26
**Auditeur** : Claude Opus (read-only)
**Scope** : `src/app/(product)/*`, `src/app/admin/*`, `src/components/*`, `src/lib/data/*`, `src/lib/pdf/*`
**Règle auditée** : CLAUDE.md §2 — *"Every metric has a provenance badge: Live / Oracle / Attested / Estimated / Manual / Stale."*

---

## Résumé exécutif

Le composant `ProvenanceBadge` (`src/components/ui/provenance-badge.tsx`) expose **7 kinds** (`live`, `oracle`, `attested`, `estimated`, `partial`, `manual`, `stale`) — donc la spec autorise déjà un kind non documenté dans CLAUDE.md §2 (`partial`). 55 usages détectés à travers la base. La couverture est **forte sur le portfolio LP** (chaque widget porte un badge dérivé de `source: "live" | "fallback" | "stale"`) mais **trouée à 3 endroits critiques** :

1. **Statement PDF investisseur** (`/api/statements/[id]/pdf/route.tsx`) — 1 seul badge texte (`"Live · Oracle"` codé en dur, ligne 390) sur ~15 métriques imprimées (Yield YTD, Net Return, APY range, Cost Basis, Current Value, Unrealized, Realized, Total Return, toutes les lignes Positions, toutes les distributions YTD). C'est un **document juridique envoyé au LP** sans provenance — viole §2 directement.
2. **Investor Memo PDF** (`src/lib/pdf/memo-pages/*.tsx`, 8 pages) — **aucun** ne mentionne provenance/Live/Estimated/Attested. Performance overview, mining health, risk framework, BTC tactical, allocation breakdown : zéro marqueur. Le memo est pourtant la pièce institutionnelle qui contient APY achieved, NAV, max drawdown, worst month.
3. **Admin Distributions / Monitoring / Customers / Proofs / Signals / Governance / Vaults list** : 7 pages admin avec des tables de chiffres (montants USDC, recipients count, AUM, cost USD, latency ms, KYC totals, principal) **sans aucun badge**. Côté admin la règle est moins critique mais reste fixée par §2 ("every metric").

Au-delà des trous, **3 incohérences de kind** détectées :
- `kind="estimated"` sur `apyTarget` (vault catalog `engine/vaults.ts`) est correct, mais la même valeur APY est affichée comme `kind="live"` dans le statement PDF — contradiction.
- `timeseries-section.tsx:55` : `kind={provenance === "live" ? "stale" : provenance}` — **inversion logique** : quand la provenance entrée est `"live"` on affiche **stale** au LP. Si l'intent est "live mais empty-state ⇒ stale", c'est mal nommé et trompeur côté UX.
- `proof-pulse.tsx:127-128` : **deux badges côte-à-côte** (`attested` + `oracle`) sans rattachement à une métrique précise. Pattern `Badge × N` au lieu de `Metric × ProvenanceBadge`.

**Aucune logique freshness centralisée** : 4 modules implémentent leur propre seuil :
- `btc-price.ts` : `STALE_THRESHOLD_MS = 5 min`
- `hashprice.ts` : `STALE_THRESHOLD_MS = 10 min`
- `fear-greed.ts` : `CACHE_TTL_MS = 60 min`
- `portfolio.ts` (LockMeter/RiskPulse/etc.) : pas de seuil temporel — `"stale"` est mappé sur **absence de snapshot DB**, jamais sur âge.

Conséquence : un `VaultSnapshot` de 3 jours sera affiché **"Live"** sur le dashboard admin alors que `MiningMetric` de 11 minutes sera **"Stale"**. Pas de SLO de fraîcheur uniforme.

---

## Coverage par page

### Pages produit (LP-facing)

| Page | Métrique | Badge présent ? | Kind utilisé | Provenance réelle | Verdict |
|------|----------|-----------------|--------------|-------------------|---------|
| `(product)/portfolio/page.tsx` | NAV / share | OK | `live` ou `stale` (source-derived) | Calculé pure-fn (`totalValueUsdc / shares`) | OK |
| `(product)/portfolio/page.tsx` | Position Value | OK | `live` ou `stale` | DB `Position.principalUsdc + accruedYieldUsdc` | OK |
| `(product)/portfolio/page.tsx` | Yield YTD | OK | `estimated` (live) ou `stale` (fallback) | DB `InvestorTransaction` + `accruedYield` | OK — `estimated` justifié (accrued = projection) |
| `(product)/portfolio/page.tsx` | Next Distribution | OK | `estimated` | Date calculée `nextEndOfMonth()` | OK |
| `(product)/portfolio/page.tsx` | LockMeter | OK | `live` (hardcodé dans composant) | `position.subscribedAt` | OK |
| `(product)/portfolio/page.tsx` | RiskPulse | OK (via composant) | derived | DB `VaultSnapshot.riskScore` extrapolé sur 5 dimensions (composite × 0.8/0.85/0.95/1.1) | **P1** : valeur extrapolée affichée comme `live`, devrait être `estimated` |
| `(product)/portfolio/page.tsx` | DistribCalendar | OK | `attested` / `estimated` / `stale` | DB `InvestorTransaction` | OK |
| `(product)/portfolio/page.tsx` | ProofPulse | 2 badges côte-à-côte | `attested` + `oracle` | DB `Proof.postedAt` + onChainTvl (toujours 0) | **P2** : badge dual sans rattachement métrique précis |
| `(product)/portfolio/page.tsx` | YieldStack | OK | `estimated` ou source-derived | DB `VaultSnapshot.allocations` | OK |
| `(product)/portfolio/page.tsx` | ValueChart (NAV 13 mois) | OK (via composant) | source-derived | DB `VaultSnapshot.aumUsdc` | OK |
| `(product)/portfolio/page.tsx` | RecentActivity | OK | source-derived | DB `InvestorTransaction` | OK |
| `(product)/portfolio/[positionId]/page.tsx` | Tous KPIs (P&L, APY, principal, accrued, distributed) | OK (via `Metric` + `PositionKpis`) | derived | DB `loadPosition()` | OK |
| `(product)/profile/page.tsx` | Active positions count | Manque sur valeur | header `live` seulement | DB | **P2** : header porte le badge mais chaque stat (count, deployed, first sub) n'a pas de marquage propre |
| `(product)/profile/page.tsx` | Total deployed | Manque | — | DB `sum(principalUsdc)` | **P2** |
| `(product)/profile/page.tsx` | First subscription | Manque | — | DB | **P2** (donnée immuable, `manual` ou `live` acceptable) |
| `(product)/vaults/page.tsx` | (aucune métrique numérique au niveau page — déléguée à `<ProductSelectCard>`) | OK via composant | `estimated` | engine fixture | OK |
| `(product)/vaults/[id]/page.tsx` | APY range hero | OK | `estimated` | engine fixture | OK |
| `(product)/vaults/[id]/page.tsx` | Min ticket / lock-up footer | Manque | — | DB `VaultDeployment` | **P2** (donnée contractuelle, `manual` acceptable mais doit exister) |
| `(product)/vaults/[id]/invest/confirmed/page.tsx` | Tx hash + receipt | OK | `attested` × 2 | tx receipt | OK |
| `(product)/proof-center/page.tsx` | Empty state | OK | `stale` | — | OK |

### Pages admin

| Page | Métrique | Badge présent ? | Kind utilisé | Provenance réelle | Verdict |
|------|----------|-----------------|--------------|-------------------|---------|
| `admin/dashboard/page.tsx` | AUM | OK | `custody.provenance` (live\|manual) | Fireblocks ou fallback | OK |
| `admin/dashboard/page.tsx` | APY range | OK | `estimated` (toujours) | engine `vault.apyRange` | OK |
| `admin/dashboard/page.tsx` | Stressed APY | OK | `estimated` | engine `vault.stressedApyRange` | OK |
| `admin/dashboard/page.tsx` | Risk score | OK | `estimated` | DB `vault.riskScore` (devrait être `live` si DB, `estimated` si engine) | **P2** : data DB affichée comme `estimated` — incohérent avec custody |
| `admin/dashboard/page.tsx` | Next distribution | OK | `estimated` | DB `latestDistribution.paid_at` | **P2** : si `paid_at` existe la valeur est historique, pas `estimated` |
| `admin/dashboard/page.tsx` | Allocation breakdown | Manque sur les lignes "estimated contribution" | — | engine + DB | **P2** : la donut a `kind="oracle"` (correct) mais le texte "estimated contribution" n'a pas de badge à droite |
| `admin/dashboard/page.tsx` | Advanced metrics (Sharpe, Sortino, VaR, MaxDD) | OK | `estimated` ou `partial` | engine calc | OK |
| `admin/dashboard/page.tsx` | DeFi positions / Fee accrual / NAV per share | OK | `manual` (PendingValue) | placeholder `—` | OK (legitimate Manual) |
| `admin/dashboard/page.tsx` | Mining margin / hashprice trend / op confidence (via `MiningHealthSection`) | OK | source-derived | DB | OK |
| `admin/dashboard/page.tsx` | BTC tactical card | OK partial | `estimated` (header), `stale`/`live` (price), `estimated` (next accumulate) | mix | OK |
| `admin/distributions/page.tsx` | History table (amount USDC × recipients × distributedAt × txHash) | **Manque sur toutes lignes** | — | DB `Distribution` | **P0** — table financière sans provenance, 6 colonnes affectées |
| `admin/customers/page.tsx` | Active positions count × Total principal × Joined | **Manque sur toutes lignes** | — | DB `Investor` | **P1** — sup admin mais §2 strict |
| `admin/monitoring/page.tsx` | Total Runs, Success Rate, Total Cost, Avg Latency (4 KPI) + tables (runs by agent, recent runs latency/cost) | **Manque tous** | — | DB `LlmRun` | **P1** — coûts \$ affichés sans badge |
| `admin/proofs/page.tsx` | (counts uniquement, pas vraiment de métrique) | OK | — | — | OK |
| `admin/signals/page.tsx` | Counts par status (Pending/Approved/etc.) | Manque | — | DB `RebalanceEvent.groupBy` | **P2** — comptages plutôt que métriques |
| `admin/vaults/page.tsx` | AUM × Capacity × Target APY (par card) | **Manque sur chaque card** | — | DB `VaultDeployment` + Positions | **P1** — chiffres financiers AUM `$X / $Y` sans provenance |
| `admin/vaults/[id]/page.tsx` | KPIs Target APY / Fees / Lock-up / AUM | **Manque sur chaque Card** | — | DB | **P1** — page détail vault sans aucun badge |
| `admin/scenario-lab/page.tsx` | APY Range × Risk Score (via studio) | OK | `estimated` | engine output | OK |
| `admin/projection/studio.tsx` | APY Range × Risk Score | OK | `estimated` | engine output | OK |
| `admin/proof-center/page.tsx` | Délégué à `PorSummary` + `EventTimeline` + `ContractsAuditTrail` | OK | derived (`attested`/`stale`) | onchain + DB | OK |
| `admin/governance/page.tsx` | Counts par tab + ages | Manque | — | DB `GovernanceProposal` | **P2** |
| `admin/governance/proposal/[id]/page.tsx` | Quorum, voting power, timelock countdown | À vérifier | — | DB | **P2** — non audité ligne par ligne |

### lib/data — retournent-ils la provenance ?

| Module | Retourne provenance ? | Forme | Verdict |
|--------|----------------------|-------|---------|
| `lib/data/custody.ts` | OUI | `{ provenance: "live" \| "manual", ... }` | OK |
| `lib/data/btc-price.ts` | OUI (via `stale: boolean`) | `{ usd, stale, fetched_at }` | OK partiel — flag bool, pas le kind du composant |
| `lib/data/hashprice.ts` | OUI (via `stale: boolean`) | idem | OK partiel |
| `lib/data/fear-greed.ts` | OUI | `{ source: "live"\|"fallback", stale: boolean }` | OK |
| `lib/data/portfolio.ts` | OUI (partiel) | `{ ..., source: "live" \| "fallback" \| "stale" }` sur loadPortfolio + 5 widget loaders | OK — le **bon** pattern à généraliser |
| `lib/data/dashboard.ts` | OUI partiel | `source: "db" \| "fallback"` au top-level mais pas par champ | **P1** — un seul flag pour 30+ valeurs, granularité insuffisante |
| `lib/data/customers.ts` | NON | aucune | **P1** |
| `lib/data/monitoring.ts` | NON | aucune | **P1** |
| `lib/data/vaults.ts` | NON | aucune (catalog statique) | **P2** acceptable car catalog immuable, mais devrait exposer `manual`/`oracle` |
| `lib/data/advanced-metrics.ts` | OUI | `{ provenance: "estimated" \| "partial" }` | OK |
| `lib/data/risk-framework.ts` | À vérifier | — | non audité, mais consommé par `RiskFrameworkSection` |
| `lib/data/time-to-cash.ts` | Calcul pur, pas de provenance retournée | — | OK (consumer mappe `live` + `estimated`) |
| `lib/data/proofs.ts` | OUI implicite (kind = source) | — | OK |

### PDFs

| Document | Pages | Provenance présente ? | Verdict |
|----------|-------|----------------------|---------|
| `api/statements/[id]/pdf/route.tsx` | LP Statement (1 page A4) | **NON** sauf "Live · Oracle" hardcodé sur Total Value | **P0** — 14 autres métriques sans marquage |
| `lib/pdf/memo-template.tsx` (Investor Memo) | 8 pages | **NON, zéro occurrence** | **P0** — performance, mining, risk, BTC tactical, allocation : aucun badge |

### Freshness centralisée

| Where | Seuil | Source | Verdict |
|-------|-------|--------|---------|
| `btc-price.ts` | 5 min | local const | éparpillé |
| `hashprice.ts` | 10 min | local const | éparpillé |
| `fear-greed.ts` | 60 min | local const | éparpillé |
| `portfolio.ts` (5 widgets) | Pas d'âge — `"stale"` = absence de snapshot | code in-place | **P1** — un snapshot vieux de 30j est `"live"` |
| `dashboard.ts` | Pas de seuil temporel — `source: "fallback"` si pas de snapshot | code in-place | **P1** |
| **Aucun module centralisé** | — | — | **P1** : `src/lib/freshness.ts` n'existe pas |

---

## Findings P0 / P1 / P2

### P0 — Bloquants pour conformité §2

**P0-1 — Statement PDF LP (`/api/statements/[id]/pdf/route.tsx`)**
- Une seule métrique sur ~15 porte un marqueur de provenance, et c'est un texte hardcodé `"Live · Oracle"` (ligne 390) — pas un kind structuré.
- Métriques non marquées : Yield YTD, Net Return, APY Range (Target), Cost Basis, Current Value, Unrealized, Realized, Total Return, toutes lignes Positions (principal, accrued, distributed, APY, since), toutes lignes Distributions YTD.
- C'est le document **téléchargeable depuis `/portfolio` par chaque LP** (cf. SurpriseDelightBar) — viole §2 frontalement.

**P0-2 — Investor Memo PDF (`src/lib/pdf/memo-pages/*.tsx`)**
- 8 pages PDF, zéro occurrence de "Live/Estimated/Attested/Stale/Manual/Oracle/provenance" dans les fichiers de pages.
- Performance overview : APY achieved, distribution USDC, NAV USDC, total return %, max drawdown %, worst month % — aucun marqueur. Mining health, BTC tactical, risk framework, allocation breakdown idem.
- Document remis aux investisseurs institutionnels chaque mois — viole §2 frontalement.

**P0-3 — Admin Distributions (`src/app/admin/distributions/page.tsx`)**
- Table "History (last 6)" affiche 6 distributions × 4 colonnes numériques/temporelles (Amount USDC, Recipients, Distributed at, Tx hash) — aucun badge ni au niveau table ni par ligne.
- Page utilisée par l'admin pour confirmer les distributions futures — décisions financières prises sans contexte de provenance.

### P1 — Importants

**P1-1 — Pages admin sans aucun badge (5 pages)**
- `admin/vaults/page.tsx` (liste vaults — AUM vs Capacity, Target APY par card)
- `admin/vaults/[id]/page.tsx` (KPI grid Target APY / Fees / Lock-up / AUM)
- `admin/customers/page.tsx` (table investors : active positions, total principal, joined)
- `admin/monitoring/page.tsx` (4 KPI cards Total Runs / Success Rate / Total Cost / Avg Latency + 2 tables runs by agent + recent runs)
- `admin/signals/page.tsx` (counts par status — moindre, P2)

**P1-2 — Loaders sans champ provenance**
- `lib/data/customers.ts` et `lib/data/monitoring.ts` ne retournent aucune provenance par enregistrement. Conséquence : impossible pour la page UI de poser un badge correct même si l'envie y était. Doit retourner `{ value, provenance }` ou un flag `source: "live"|"stale"|"fallback"` au minimum.
- `lib/data/dashboard.ts` retourne `source: "db" | "fallback"` au top-level — granularité **trop grossière** : `vault.aumUsdc` (live snapshot), `vault.stressedApy` (engine calc) et `vault.miningMarginScore` (live DB) sont mappés sous le même flag alors que leurs vraies provenances diffèrent (`live` vs `estimated` vs `live`).

**P1-3 — Pas de logique freshness centralisée**
- Aucun `src/lib/freshness.ts` ou équivalent. Chaque module implémente son propre seuil (`STALE_THRESHOLD_MS` redéfini dans `btc-price.ts`, `hashprice.ts`, `fear-greed.ts`).
- Pour les loaders DB (`portfolio.ts`, `dashboard.ts`) : `"stale"` est mappé sur **absence** de snapshot, jamais sur **âge** du snapshot. Un `VaultSnapshot` daté de 3 jours est traité comme `"live"`. Conséquence : §2 mention de "Stale" devient inopérante côté DB.

**P1-4 — RiskPulse extrapolation affichée comme `live`**
- `loadRiskPulseProps` (`portfolio.ts:291`) lit `composite` réel puis génère 5 dimensions par multiplication arbitraire (`composite * 0.95`, `* 0.85`, etc.) et `delta30d: 0` hardcodé. Mais le retour vaut `source: "live"` → le LP voit "Live" sur des chiffres inventés. Devrait être `estimated` ou `partial`.

**P1-5 — `timeseries-section.tsx:55` inversion logique**
- `<ProvenanceBadge kind={provenance === "live" ? "stale" : provenance} />` — quand la donnée est live on affiche stale. Code dans le `ChartEmpty` (état vide). Si l'intent est "live mais empty", le label `live` resterait correct ; transformer en `stale` est trompeur pour le LP qui voit "données obsolètes" sur un placeholder vide. À renommer ou supprimer l'inversion.

### P2 — Mineurs / cosmétiques

**P2-1 — `ProofPulse` deux badges sans rattachement**
- `src/components/portfolio/proof-pulse.tsx:127-128` : `<ProvenanceBadge kind="attested" /><ProvenanceBadge kind="oracle" />` côte-à-côte dans le CardHeader, sans dire quelle métrique est attestée et laquelle est oracle. Le LP ne peut pas déduire. Soit un badge dual labellé, soit deux badges accolés à leurs lignes (Vault TVL → attested, On-chain TVL → oracle).

**P2-2 — Profile page : stats sans badge propre**
- `(product)/profile/page.tsx:127` : un seul `<ProvenanceBadge kind="live" />` sur le header "Investment summary", couvrant 3 stats (Active positions, Total deployed, First subscription). Devrait être un badge par stat (Metric primitive existe déjà).

**P2-3 — Vault detail (LP) — footer sticky CTA**
- `(product)/vaults/[id]/page.tsx:144-148` affiche `Min. $250k · 60d lock-up` sans badge. Donnée contractuelle (`manual` acceptable) mais doit exister.

**P2-4 — Dashboard `nextDistLabel`**
- `admin/dashboard/page.tsx:248` : `provenance="estimated"` sur une `latestDistribution.paid_at` issue de DB historique (pas une projection). Devrait être `live` (ou `attested`) quand `paid_at !== null`.

**P2-5 — `<Metric>` primitive — `provenance` optionnel**
- `src/components/ui/metric.tsx:39` : `{provenance ? <ProvenanceBadge kind={provenance} /> : null}` — le badge est skippable silencieusement. Le typage devrait rendre `provenance` **requis** pour forcer §2 au compile-time. Cela attraperait les oublis ci-dessus.

**P2-6 — Kind `partial` non documenté dans CLAUDE.md §2**
- §2 énumère 6 kinds, le composant en expose 7 (`partial` ajouté). Soit on retire de l'enum, soit on met CLAUDE.md à jour.

---

## Recommandations

1. **Bloquer §2 au type-level** — passer `provenance` en prop requise dans `<Metric>` (`src/components/ui/metric.tsx`), et créer un type guard `requireProvenance<T>(loader)` au niveau des `lib/data/*` retournant `Result<T, MissingProvenance>`. Toute fuite échoue le build.

2. **Centraliser la freshness** — créer `src/lib/freshness.ts` exposant :
   - `const SLO = { custody: 60_000, hashprice: 10*60_000, btc_price: 5*60_000, snapshot: 24*60*60_000, ... }`
   - `function deriveProvenance({ liveValue, asOf, kind, slo }): Provenance` qui retourne automatiquement `stale` si `Date.now() - asOf.getTime() > slo[kind]`.
   - Refactor `portfolio.ts` et `dashboard.ts` pour passer par ce helper plutôt que de mapper `source: "fallback"` sur `stale` sans regarder l'âge.

3. **Combler P0 PDFs** — ajouter une colonne/cellule "Source" dans chaque table PDF (statement + memo), avec libellé texte ("Live", "Estimated", etc.) et icône (•). React-PDF supporte les vues simples ; pas besoin de réécrire `ProvenanceBadge`. Pour le memo : ajouter une légende `Live = on-chain · Estimated = engine projection · Manual = curated` en footer chaque page.

4. **Combler P0 admin distributions** — décorer chaque ligne de la table `History (last 6)` avec un badge `attested` (txHash présent) ou `manual` (sinon). Au minimum un badge sur le header de la table.

5. **Refactor `lib/data/dashboard.ts`** — remplacer `source: "db" | "fallback"` (top-level) par `{ value, provenance }` par champ critique (AUM, riskScore, miningMargin, hashpriceTrend, latestDistribution). Sinon `admin/dashboard/page.tsx` ne peut pas afficher la bonne provenance par métrique.

6. **Ajouter retour provenance aux loaders manquants** — `customers.ts`, `monitoring.ts`, `vaults.ts` doivent retourner `{ items, provenance }` ou enrichir chaque enregistrement.

7. **Corriger `timeseries-section.tsx:55`** — soit garder `live` même en empty-state (la donnée existe, elle est juste vide pour la fenêtre), soit ajouter un kind `"empty"` explicite. L'inversion actuelle ment au LP.

8. **Décider sur `partial`** — soit l'ajouter à CLAUDE.md §2 et ADR-006, soit le retirer du composant. La discordance spec/code est un piège pour les futurs auditeurs.

9. **Tests CI** — ajouter un test ESLint/grep dans CI qui échoue si un fichier sous `src/app/(product)/*` ou `src/app/admin/*` contient `toFixed|toLocaleString|tabular` mais pas `ProvenanceBadge`. Garde-fou contre les régressions.

10. **`ProofPulse` dual badge** — splitter en deux Metric distincts (Vault TVL → attested / On-chain TVL → oracle) plutôt qu'un dual badge orphelin dans le header.

---

**Conclusion auditeur** : la règle §2 est bien armée côté **portfolio LP web** (qualité élevée, pattern source-derived correct dans `lib/data/portfolio.ts`) mais **3 PDF/admin majeurs** la violent frontalement, **5 loaders** ne retournent pas la provenance (P1), et **aucune logique de fraîcheur centralisée** n'existe (chaque consumer doit gérer son seuil, ce qui rend `Stale` largement inopérant). La fondation est saine ; les rustines sont localisées et chiffrables.
