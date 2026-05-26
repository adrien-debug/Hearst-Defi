# Audit cohérence Portfolio LP — IRR / returns / tax / time-to-cash / distributions

**Date** : 2026-05-26
**Périmètre** : `src/lib/portfolio/{irr,returns,positions,tax}.ts`, `src/lib/data/{portfolio,time-to-cash,advanced-metrics,vaults}.ts`, `src/lib/engine/{lp-pnl,share-class}.ts`, `src/app/(product)/portfolio/page.tsx`, `prisma/schema.prisma`.
**Mode** : read-only (aucune modification ni commit).
**Roadmap croisée** : `lp-portal` (V1 validated), `share-class-a/-b` (V1 validated), `lp-export-pdf-statement`, `lp-tax-docs-preview`, `sota-maple-time-to-cash`, `advanced-metrics`.

---

## Résumé exécutif

Le portail LP expose **deux familles d'outils mathématiques côte à côte sans contrat explicite** :

- `src/lib/portfolio/*` (livré pour `lp-portal` V1) — XIRR Newton-Raphson, returns mensuels sur NAV, tax 1099/CRS stub déterministe.
- `src/lib/engine/lp-pnl.ts` + `src/lib/data/portfolio.ts` (consommé par `/(product)/portfolio/page.tsx`) — P&L simple, annualisation linéaire non composée, agrégation par contrib-weighted days.

**Le page LP `/(product)/portfolio` ne consomme PAS `src/lib/portfolio/*`** — il consomme `loadPortfolio` (`@/lib/data/portfolio` via wrapper démo) qui appelle `aggregateLpPnl` (engine `lp-pnl`). XIRR / returns / tax ne sont reliés à AUCUNE page LP du segment `/(product)/portfolio` ; ils sont seulement référencés par `src/app/portfolio/_pnl-table.tsx` (route legacy non liée à la navigation principale) et `src/components/portfolio/risk-metrics-panel.tsx`. Résultat : **deux définitions de "annualised return" coexistent dans le code et peuvent toutes deux apparaître à l'écran** (XIRR composé via `getPositions` vs annualisation simple via `aggregateLpPnl`).

**Share class scoping inexistant côté portfolio** : aucun module portfolio LP ne lit `vaultDeployment.shareClass` pour piloter une rule fee de A vs B. Le `DistribCalendar`, les disclaimers et la cadence sont hard-codés `shareClass: "A"` dans `loadDistribCalendarProps` (lignes 343, 359, 375 de `portfolio.ts`). Un LP class B verrait les termes class A.

**Aucune source de vérité unique pour l'AUM** : `loadPortfolio.totalValueUsdc` somme les positions de l'investor (principal+accrued), tandis que `/dashboard`, `/vaults`, `loadProofPulseProps` (dans le même fichier !) lisent `VaultSnapshot.aumUsdc`. Les deux peuvent diverger silencieusement.

**Tax preview livré comme `lp-tax-docs-preview` validé** : la fonction `getTaxPreview` n'est appelée par AUCUNE route du produit (`grep -rn "getTaxPreview" src/app/` = 0 hit hors tests). Les overrides `actualInterestIncomeUsd` / `actualPrincipalUsd` ne sont jamais câblés ; un LP voit aujourd'hui un montant 1099 calculé via `userId.length × 100 + 12_000`. Donnée fausse, non-cohérente avec ses distributions réelles, marquée comme `docStatus: "preview"` mais sans avertissement de fabrication.

**Tally** : 14 findings (3 P0, 6 P1, 5 P2).

---

## Table métrique LP × formule × source de vérité × cohérence inter-module

| Métrique LP | Formule | Source de vérité | Provenance UI | Cohérence | Verdict |
|---|---|---|---|---|---|
| **Position value (UI hero)** | `principal + accruedYield` | `Position.principalUsdc + accruedYieldUsdc` (Prisma) via `loadPortfolio` | `live` / `fallback` | OK | OK |
| **Total value (header `loadPortfolio`)** | `Σ position.valueUsdc` | Sommation positions investor | `live` | **Divergent** du `VaultSnapshot.aumUsdc` lu côté dashboard | **P1** |
| **AUM côté `/vaults` & `/dashboard`** | `latestSnapshot.aumUsdc` | `VaultSnapshot.aumUsdc` (snapshot global) | `live` | Pas mis en relation avec sum(positions) | **P1** |
| **NAV / share (page hero)** | `totalValueUsdc / totalPrincipal`, par = 1.00 | Page `portfolio/page.tsx` (calcul inline) | `live` / `stale` | "Par $1.00 · class A" hard-codé, jamais lu depuis vaultDeployment | **P1** |
| **Yield YTD** | `Σ tx(claim+distribution since Jan 1) + Σ position.accruedYieldUsdc` | `InvestorTransaction` + `Position.accruedYieldUsdc` | `estimated` | **Double-comptage potentiel** : si une `distribution` baisse `accruedYieldUsdc`, OK ; sinon, l'accrued payé est compté deux fois (une fois comme distrib YTD, une fois comme accrued courant). Aucun test ne couvre cette transition. | **P0** |
| **Realized P&L (positions.ts)** | `Σ InvestorTransaction(type="distribution", positionId=X).amountUsdc` | Prisma | `live` | Cohérent | OK |
| **Realized (engine lp-pnl)** | input `distributedUsdc` venant de `Position.distributedUsdc` (colonne dénormalisée) | Prisma | `live` | **Deux sources concurrentes pour realized** (`Position.distributedUsdc` dénormalisé vs `Σ InvestorTransaction`). Aucun test d'invariant. | **P0** |
| **Unrealized P&L** | `accruedYieldUsdc` (Position) | Prisma | `live` | OK | OK |
| **TotalReturn** | `realized + unrealized` (lp-pnl) ou `unrealized + realized` (positions.ts, navMult-based) | Deux chemins | `live` | Cohérent **uniquement si `currentNav == principal+accrued`**. positions.ts utilise `Math.round(currentNav*100)/100` puis recompute unrealized comme `currentNav-costBasis` (égal à accrued mais round-trippé). Aucun risque sérieux. | OK |
| **IRR annualisé (positions.ts)** | XIRR Newton-Raphson, act/365, anchor = earliest CF, terminal CF = currentNav `@asOf` | `src/lib/portfolio/irr.ts` | `estimated` | Méthodologie **non documentée** dans `docs/methodology/v1.0.md`. Aucun lien dans UI. | **P1** |
| **annualizedReturnPct (engine lp-pnl)** | `netReturnPct × (365 / daysHeld)` — linéaire, non composé | `src/lib/engine/lp-pnl.ts` | aucun badge | **Diverge de l'IRR** sur >12 mois. Tous deux peuvent être affichés (positions-list vs position-kpis). | **P0** |
| **TWR (Time-Weighted)** | Absent du codebase | — | — | Non implémenté. Methodology v1.0 ne mentionne pas le choix TWR vs MWR. | **P1** |
| **MWR (Money-Weighted)** | XIRR de positions.ts = MWR de facto | `src/lib/portfolio/irr.ts` | "Estimated" | Pas étiqueté "MWR" dans l'UI | **P2** |
| **Returns mensuels** | `nav_t / nav_{t-1} - 1` sur `VaultSnapshot.aumUsdc` | `src/lib/portfolio/returns.ts` | `live/partial/fallback` | **N'ajoute PAS les distributions** (TWR pur sur NAV) → biais à la baisse de chaque mois où une distribution est versée. `advanced-metrics.ts` calcule différemment (`(nav_t - nav_{t-1} + dist_t) / nav_{t-1}`). **Deux formules de returns dans le même repo.** | **P0** |
| **Sharpe / Sortino** | Engine `calcSharpe/calcSortino` sur returns ci-dessus | `src/lib/engine/ratios.ts` | `partial` / `estimated` | `RISK_FREE_RATE = 0.045` hard-codé (TODO ligne 34 `advanced-metrics.ts`) ; `SORTINO_TARGET = 0.045` aussi. Aucun lien vers methodology. **Source non documentée** (US 1-Y ? SOFR ? T-Bill ?). | **P1** |
| **Max Drawdown** | `calcMaxDrawdown(navSeries)` | engine | OK | OK | OK |
| **VaR 95** | `calcVaR(returns, 0.95)` | engine | OK | OK | OK |
| **Calmar** | `calcCalmar(returns, navSeries, 12)` | engine | OK | OK | OK |
| **Fees affichées (mgmt/perf)** | `vaultDeployment.{mgmtFeeBps, perfFeeBps}` (200/1000) OU `SHARE_CLASS_A` engine (100/1000) | **Deux sources contradictoires** | n/a | **Class A engine = 100 bps mgmt, fixture vault = 200 bps mgmt.** Selon le composant, l'investor voit 1% ou 2%. | **P0** |
| **Hurdle** | `hurdleBps: 0` partout (engine A/B + fixture + schema default) | uniforme | n/a | OK | OK |
| **1099-INT (interest income YTD)** | `12_000 + (userId.length + charCode) × 100` (stub déterministe) | `getTaxPreview` non câblé | "preview" | **Aucun appel depuis `src/app/`**. UI consomme un placeholder qui n'a aucun lien avec les distributions réelles de l'investor. | **P0** |
| **1099-B (proceeds, ST/LT gain)** | `proceedsUsd = 0` toujours ; ST/LT split à 365j sur accruedYield notionnel | `compute1099B` | "preview" | Logique correcte pour soft-lockup, mais inputs proviennent du même stub. | **P1** |
| **CRS (other income)** | `grossInterest × 0.62` (mining component ratio hard-codé) | `computeCrs` | "preview" | Ratio 62% non documenté, non sourcé. | **P2** |
| **Time-to-cash (next distribution date)** | `cycleStart + cycleDays × 86400000` (purement géométrique) | `computeTimeToCash` (pure) | "live" + "estimated" | **N'utilise jamais `Distribution.distributedAt`** (et `Distribution.scheduledAt` n'existe pas dans le schema). La cadence "Day 1, T+5" est un literal. `nextDistributionAt` (header KPI) utilise `nextEndOfMonth()` — encore une autre logique. **Deux dates "next distribution" dans la même page.** | **P0** |
| **Projected USDC (time-to-cash)** | Reçu en prop `projectedUsdc` — pas calculé | passé par le caller | "estimated" | Aucun caller dans `src/app/(product)/portfolio/page.tsx` — widget non monté. | **P2** |
| **Distribution calendar (cadence + share class label)** | `shareClass: "A"`, `cadence: "monthly, T+5"` literals | `loadDistribCalendarProps` lignes 343/359/375 | "live" / "stale" | Aucune lecture de `Position.vaultDeployment.shareClass`. **Un LP class B verrait class A.** | **P0** |
| **Lock release date** | `subscribedAt + softLockupDays` (60d default si pas de vaultDeployment) | `positions.ts` ligne 158 | "live" | Soft-lockup peut différer par share class (A=60d, B=90d dans engine). `getPositions` lit `vaultDeployment.softLockupDays`, mais `loadLockMeterProps` (page hero) hard-code `60`. **Inconsistance.** | **P1** |

---

## Findings P0 / P1 / P2

### P0 — Bloquants (5)

**P0-1 — Double définition "annualised return" affichée simultanément**
`getPositions` (XIRR Newton-Raphson composé) et `aggregateLpPnl` (linéaire non composé) calculent tous deux un "annualised return" et peuvent tous deux s'afficher (positions-list, position-kpis). Sur 6 mois à +5% net, XIRR donne ~10.25%, l'annualisation simple donne 10.00% ; sur 24 mois à +20%, XIRR donne ~9.54%, le simple donne 10.00%. **L'écart est invisible pour le LP**, qui ne sait pas lequel il lit.
*Fichiers* : `src/lib/portfolio/positions.ts:178`, `src/lib/engine/lp-pnl.ts:55-59`, `src/components/portfolio/position-kpis.tsx:42`.

**P0-2 — Two formulas for monthly returns (TWR vs adjusted)**
- `src/lib/portfolio/returns.ts:91` : `navCur / navPrev - 1` (NAV-only ; sous-estime quand une distribution sort).
- `src/lib/data/advanced-metrics.ts:121` : `(nav_t - nav_{t-1} + dist_t) / nav_{t-1}` (correct add-back).

Sharpe / Sortino sont calculés sur la série *correcte*, mais le composant `risk-metrics-panel.tsx` (consommateur de `getVaultReturns`) calcule Sharpe sur la série *biaisée*. Deux Sharpe différents existent dans le repo.
*Fichiers* : `src/lib/portfolio/returns.ts:91`, `src/lib/data/advanced-metrics.ts:121`, `src/components/portfolio/risk-metrics-panel.tsx`.

**P0-3 — Share class hard-coded à "A" dans le portfolio LP**
`loadDistribCalendarProps` retourne `shareClass: "A"` en dur (lignes 343, 359, 375) sans jamais lire la share class réelle de la position. `loadLockMeterProps` hard-code aussi `softLockupDays: 60` (ligne 279) et `earlyExitPenaltyBps: 150` (ligne 280), alors que `share-class.ts` définit B=90j. Un LP class B voit des termes class A. **Risque légal** : afficher de mauvais termes contractuels à un LP est un faux affichage de prospectus.
*Fichiers* : `src/lib/data/portfolio.ts:249-284,339-379`.

**P0-4 — Fee inconsistency : engine SHARE_CLASS_A = 100 bps mgmt, fixture vault = 200 bps mgmt, schema default = 200 bps**
- `src/lib/engine/share-class.ts:26` : `mgmtFeeBps: 100` (1%)
- `src/lib/data/vaults.ts:64` : `mgmtFeeBps: 200` (2%) dans le HEARST_YIELD_VAULT_FIXTURE
- `prisma/schema.prisma:405` : `mgmtFeeBps Int @default(200)`

Les composants `term-sheet-preview.tsx` et `share-class-compare.tsx` lisent `SHARE_CLASS_A` (1%), mais `getPositions` et `getVault` exposent les fees `vaultDeployment.mgmtFeeBps` (2%). **Le LP voit 1% sur la page compare-share-class et 2% sur la page vault detail.** CLAUDE.md précise pourtant "1+10 / 0.75+8" = c'est la version engine (1%) qui colle au plan, donc tous les `200` Prisma sont des bugs.
*Fichiers* : `src/lib/engine/share-class.ts:26`, `src/lib/data/vaults.ts:64`, `prisma/schema.prisma:405-407`.

**P0-5 — Tax preview livré (`lp-tax-docs-preview` validated dans roadmap) mais non câblé**
`getTaxPreview(userId, year)` n'est appelé par aucune route du produit (`grep -rn "getTaxPreview" src/app/` → 0 hit). Le composant `tax-docs-drawer.tsx` reçoit un `preview: TaxPreview` mais aucun caller ne le passe avec des données réelles. La fonction n'accepte pas `prisma` par injection — elle utilise un stub `userId.length × 100 + 12_000` qui n'a rien à voir avec les distributions réelles. **Le LP voit un montant 1099 inventé.** Le `docStatus: "preview"` est insuffisant : il ne dit pas que les chiffres sont fabriqués.
*Fichiers* : `src/lib/portfolio/tax.ts:187-237`, `src/components/portfolio/tax-docs-drawer.tsx`.

### P1 — Importants (6)

**P1-1 — Pas de source de vérité unique pour l'AUM / total value**
`loadPortfolio.totalValueUsdc = Σ Position.valueUsdc` (utilisateur-scopé). `listVaults` et `loadDashboardData` exposent `currentAumUsdc = latestSnapshot.aumUsdc` (vault-wide). Aucune réconciliation. Sur un produit single-vault, ces deux nombres devraient être proportionnels (un LP ≤ AUM total). Aucun garde-fou.
*Fichiers* : `src/lib/data/portfolio.ts:192`, `src/lib/data/vaults.ts:233`, `src/lib/data/dashboard.ts:480`.

**P1-2 — XIRR méthodologie non documentée**
`src/lib/portfolio/irr.ts` implémente XIRR Newton-Raphson act/365, mais `docs/methodology/v1.0.md` ne mentionne ni "XIRR" ni "IRR" ni "MWR" ni "TWR". Non-négociable #1 (APY en range) est respecté pour les vaults, mais aucune règle équivalente n'existe pour les métriques de performance LP. Le label `provenance: "Estimated"` est mis dans la JSDoc mais aucun badge n'est rendu à côté du nombre.
*Fichiers* : `src/lib/portfolio/positions.ts:50`, `docs/methodology/v1.0.md`.

**P1-3 — Risk-free rate hard-coded sans source**
`RISK_FREE_RATE = 0.045` (4.5%) et `SORTINO_TARGET = 0.045` dans `advanced-metrics.ts`. TODO acknowledgé ligne 32 ("source from config/oracle"). Aucune référence : pas de SOFR, pas de T-Bill 1Y. Sharpe affiché peut sous-estimer si le risk-free réel est >4.5% (US 1Y aujourd'hui ~5.2%) ou sur-estimer s'il est <4.5%.
*Fichiers* : `src/lib/data/advanced-metrics.ts:33-34`.

**P1-4 — NAV / share basé sur "$1 par" hard-codé**
La page hero (`NavShareKpi`) calcule `navPerShare = totalValueUsdc / totalPrincipal` puis affiche "Par $1.00 · class A". Le `par` n'est jamais lu depuis vaultDeployment ; la share class est en dur. Pour un produit multi-vault (V1+), NAV/share doit être par-vault, par-class.
*Fichiers* : `src/app/(product)/portfolio/page.tsx:146-169`.

**P1-5 — Yield YTD double-compte potentiel**
`totalYieldYtdUsdc = Σ tx(claim+distribution) + Σ Position.accruedYieldUsdc`. Quand un cycle de distribution exécute, `Position.accruedYieldUsdc` doit être remis à 0 et la distribution apparaît comme tx. Si ce reset n'a pas lieu (vérif par `atomic-exec.ts`), l'accrued payé est compté deux fois. Aucun test ne couvre la transition.
*Fichiers* : `src/lib/data/portfolio.ts:195-197`, `src/lib/distribution/atomic-exec.ts`.

**P1-6 — Lock release inconsistant page vs liste**
`getPositions` (positions.ts:157) lit `vaultDeployment.softLockupDays ?? 60`. `loadLockMeterProps` (page hero) hard-code 60. Un LP class B (90 jours) verrait 60 jours dans le hero et 90 jours dans la table des positions.
*Fichiers* : `src/lib/portfolio/positions.ts:157`, `src/lib/data/portfolio.ts:277-283`.

### P2 — Cosmétiques / bonus (3)

**P2-1 — `Distribution.scheduledAt` n'existe pas — `nextDistributionAt` est géométrique**
Le schema n'a que `distributedAt DateTime` (event ex-post). Le calcul "next distribution" utilise `nextEndOfMonth()` (UTC) côté `loadPortfolio` et `cycleStart + cycleDays` côté time-to-cash. Aucun de ces deux ne reflète une "scheduled distribution" dans la base. La roadmap `sota-maple-time-to-cash` exigeait sans doute mieux.
*Fichiers* : `src/lib/data/portfolio.ts:94-107`, `src/lib/data/time-to-cash.ts:25-63`, `prisma/schema.prisma:156-174`.

**P2-2 — `TimeToCash` widget pas monté**
`src/components/portfolio/time-to-cash.tsx` existe mais n'est pas importé dans `/(product)/portfolio/page.tsx`. Roadmap `sota-maple-time-to-cash` marqué validated — vérifier que c'est intentionnel (peut-être que le `Next Distribution KPI` le remplace).
*Fichiers* : `src/components/portfolio/time-to-cash.tsx`, `src/app/(product)/portfolio/page.tsx`.

**P2-3 — IRR ne renvoie pas le badge "MWR"**
Le label "annualised IRR" affiché côté UI est ambigu. Aucun composant ne précise "Money-Weighted (XIRR)". Standardisation insuffisante avec les ratios institutionnels.
*Fichiers* : `src/components/portfolio/positions-list.tsx`, `src/app/portfolio/_pnl-table.tsx`.

---

## Recommandations

1. **Choisir UNE formule d'annualisation par contexte et documenter dans methodology v1.x** :
   - Cohort LP individuelle → MWR (XIRR de `src/lib/portfolio/irr.ts`), badge "MWR · XIRR · Estimated".
   - Performance fonds → TWR sur série NAV+distributions (formule `advanced-metrics`), badge "TWR · GIPS-compatible · Live/Partial".
   Supprimer `aggregateLpPnl.annualizedReturnPct` ou le restreindre au cas `daysHeld < 90` (avec disclaimer "simple").

2. **Unifier le calcul de returns mensuels** : `src/lib/portfolio/returns.ts` doit ajouter `+ dist_t` au numérateur ou être supprimé et remplacé par un import depuis `advanced-metrics`. Un seul `buildReturnsSeries`.

3. **Single source of truth pour share class** : créer `src/lib/portfolio/share-class-context.ts` qui résout `shareClass + terms` depuis la première `Position.vaultDeployment` active de l'investor. Toutes les fonctions `loadXxxProps` du portfolio doivent passer par lui — supprimer les literals `"A"`, `60`, `150`.

4. **Réconcilier les fees** : décider une fois pour toutes — `1%+10%` (engine) OU `2%+10%` (Prisma default + fixture). CLAUDE.md ligne 90 indique "1+10 / 0.75+8" → corriger le `@default(200)` du schema en `@default(100)` et le fixture vault en 100. Backfill les `VaultDeployment` existants.

5. **Câbler `getTaxPreview` à de vraies données** : signature actuelle accepte déjà les overrides, mais aucun caller. Créer `loadTaxPreview(userId, year)` dans `src/lib/data/portfolio.ts` qui lit `Σ InvestorTransaction(type=distribution, year=Y)` et passe `actualInterestIncomeUsd`. Tant que ce n'est pas fait, retirer le bouton "Preview 1099 / CRS" de la `SurpriseDelightBar`.

6. **Sourcer le risk-free rate** : ajouter une colonne `riskFreeRateBps` à `VaultSnapshot` (ou nouvelle table `MarketRate`), seedée par un cron Inngest depuis FRED (DGS1) ou Treasury Direct. À défaut, hard-coder dans `config/risk.ts` avec citation explicite.

7. **Ajouter un invariant test** : `Position.distributedUsdc === Σ InvestorTransaction(positionId=X, type='distribution').amountUsdc`. Si la dénormalisation drift, fail loud. Idem pour `Σ Position.principalUsdc per vault === sum(VaultSnapshot.latest.aumUsdc)` ± 1%.

8. **Ajouter `Distribution.scheduledAt`** au schema + Inngest cron qui le seed (currentMonth EOM + T+5) → `nextDistributionAt` lit ça, plus de `nextEndOfMonth()` / `cycleStart+cycleDays` parallèles.

9. **Renseigner la méthodologie v1.0** sur tous les choix de calcul performance LP (XIRR Newton, act/365, terminal CF = currentNav, risk-free rate source, ratio CRS 62%). Aujourd'hui le doc est silencieux sur tout ce qui concerne le LP statement, alors qu'il est censé être immuable.

---

## TL;DR

**14 findings (5 P0, 6 P1, 3 P2).**

Les 2 incohérences cross-module les plus graves :

1. **Trois sources de "monthly return"** (`returns.ts` NAV-only, `advanced-metrics.ts` NAV+dist, `lp-pnl.ts` simple annualisé) qui donnent trois Sharpe différents et peuvent toutes apparaître à l'écran — **personne ne sait laquelle est le chiffre officiel**.
2. **Share class hard-codée "A" dans tout le portfolio LP** (`loadDistribCalendarProps`, `loadLockMeterProps`, NAV/share KPI) **alors que les fees engine `SHARE_CLASS_A` (1%+10%) divergent des fees Prisma `@default(200)` (2%+10%)** — un LP class B voit des termes class A, et entre class A engine et class A vault deployment il voit 1% ici, 2% là.
