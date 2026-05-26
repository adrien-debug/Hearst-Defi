# Synthèse audit cohérence — 2026-05-26

**Périmètre :** méthodologie · engine · ingestion · provenance · forbidden-words · APY range · PTAI · mock-vs-live · portfolio LP · attestation.
**Méthode :** 10 sous-agents Opus en parallèle ont produit les rapports `01-` à `10-` (read-only audit). Puis 10 sous-agents Opus en parallèle ont corrigé chaque cluster (file scope non-recouvrant). Build final : `pnpm typecheck` + `pnpm lint` + `pnpm test --run` tous verts (127/127 fichiers, **1758/1758 tests**).

---

## 1 · Décompte des findings

| # | Cluster | P0 | P1 | P2 | Total |
|---|---|---:|---:|---:|---:|
| 01 | Méthodologie versions | 3 | 5 | 6 | 14 |
| 02 | Engine ↔ méthodologie | 3 | 6 | 5 | 14 |
| 03 | Agents ↔ méthodologie | 2 | 2 | 2 | 6 |
| 04 | Ingestion vs méthodologie | 3 | 5 | 2 | 10 |
| 05 | Provenance badges | 3 | 5 | 6 | 14 |
| 06 | Forbidden words | 3 | 4 | 3 | 10 |
| 07 | APY range rule | 2 | 3 | 2 | 7 |
| 08 | PTAI format | 0 | 4 | 4 | 8 |
| 09 | Mock vs live | 2 | 4 | 5 | 11 |
| 10 | Portfolio LP metrics | 5 | 6 | 3 | 14 |
| **Total** | | **26** | **44** | **38** | **108** |

---

## 2 · Patterns récurrents

1. **La méthodologie a divergé du code en silence.** v2.0 (MC) et le multi-vault ont été publiés côté docs et engine ; les agents, les outputs et les UI publiques sont restés sur v1.0. Sans pont explicite, un memo MC se présentait comme "Methodology v1.0".
2. **Les fallbacks fabriquent des chiffres au lieu de rester vides.** Lock-up 60d, penalty 150bps, methodology version, auditor, 5 sous-scores risk inventés depuis le composite, FIXTURE_VAULTS quand DB vide → tout cela produisait un dashboard "vivant" sans donnée réelle.
3. **Les sources premium déclarées (Chainlink, partner energy, T-bills) n'étaient pas connectées.** Le code utilisait des fallbacks comme primaires, sans le dire.
4. **Les règles légales (APY range, forbidden words, PTAI, provenance) étaient enforcées via discipline humaine, pas via runtime.** Pas de validator central, listes divergentes entre 5 lieux, regex laxiste.
5. **Les surfaces non-LP-facing (PDF, statements, admin tables) étaient des angles morts** — c'est là que les provenance badges manquaient le plus.
6. **Plusieurs formules concurrentes pour la même métrique** (3 monthly returns, 2 listes forbidden words, 2 thresholds "stale", share class "A" hardcodée vs class B en DB).

---

## 3 · Ce qui a été corrigé (10 clusters, exécution parallèle)

### Cluster 1 — Méthodologie versions
- Renommé `docs/methodology/v2.0-draft.md` → `v2.1-draft.md`. Title, lineage table, ADR cross-ref, footer mis à jour.
- `src/lib/agents/system-prompts/methodology.ts` accepte désormais `MethodologyVersion = "v1.0" | "v2.0"` ; helper `getMethodologyMd(version)` ; les 4 agents acceptent `opts.methodologyVersion`.
- 4 surfaces UI qui affichaient "Methodology v2.0-draft" repassent sur `v2.0` (ratifié) : `monte-carlo-review.tsx`, `monte-carlo-panel.tsx`, `_vault-form.tsx`.

### Cluster 2 — Engine Monte Carlo
- **Corrélation BTC↔difficulty** : Cholesky `zDiff = ρ·zBtc + √(1-ρ²)·zDiffIndep`. `ρ = 0.4` par défaut (clampé [-1, 1]), injectable via `MonteCarloInput.btcDifficultyCorrelation`. Snapshot MC régénéré, vérifié à la main.
- `apyMedian` renommé `apyMedianInternal` (JSDoc "NEVER LP-facing") sur `ScenarioResult` et `ScenarioDelta` — non-négociable #1 verrouillé au niveau type.
- 16 refs dans `scenario.test.ts` patchées (étape consolidation post-cluster).

### Cluster 3 — Ingestion
- **Chainlink BTC/USD wired** via `viem.readContract(latestRoundData)`. Provenance `oracle | live | stale`. Adresse mainnet canonique par défaut, override via `NEXT_PUBLIC_CHAINLINK_BTC_USD_ADDRESS`.
- **Energy cost partner** : `src/lib/data/energy-cost.ts` créé. `getEnergyCostUsdPerKwh()` lit `env.MINING_ENERGY_COST_USD_PER_KWH` sinon fallback `0.05` (provenance `manual`). 4 fichiers décrochés du `0.05` hardcodé (`market-data-hourly`, `backfill`, `rebalancing-signal`, `risk-framework`).

### Cluster 4 — Risk-free rate
- `src/lib/data/risk-free-rate.ts` créé. `getRiskFreeRate()` lit `env.RISK_FREE_RATE_ANNUAL_DECIMAL`, fallback `0.045` provenance `manual`.
- `advanced-metrics.ts` : 2 TODO supprimés, Sharpe/Sortino exposent désormais `riskFreeRate` + `riskFreeRateProvenance`.

### Cluster 5 — Provenance badges
- Statement PDF (`/api/statements/[id]/pdf`) : **14 métriques badgées** (vs 1 marqueur hardcoded "Live · Oracle"). Nouvelle colonne `Source` sur tables positions & distributions.
- Investor Memo PDF (8 pages) : **16 KPI cells + 2 table source columns** badgés. Composant `<PdfProvenance>` créé dans `src/lib/pdf/components/`.
- Admin distributions : colonne Source avec `attested` / `manual` selon `txHash`.
- **Freshness centralisée** : `src/lib/data/freshness.ts` avec `STALE_THRESHOLDS` registry + helper `evaluateFreshness(asOf, threshold)`. 3 modules migrés (`btc-price` 5min, `hashprice` 10min, `fear-greed` 60min).

### Cluster 6 — Forbidden words
- **Module canonique** `src/lib/agents/forbidden-words.ts` créé. Liste consolidée 6 mots : `guarantee`, `promise`, `certain`, `will deliver`, `risk-free`, `no risk`.
- `containsForbidden()` / `findForbiddenMatches()` avec lookbehind négation 3-mots (`not`, `no`, `never`, `without`).
- 5 lieux unifiés : `validators.ts`, `notifications/router.ts`, `hooks/use-forbidden-words.ts`, `admin/vaults/actions.ts` + tests.
- **Régression P0 fermée** : la regex `guarantee(?!d)` qui laissait passer `guaranteed`/`guarantees`/`guaranteeing` est morte.
- 46 nouveaux tests dédiés.

### Cluster 7 — APY range rule
- `yield-stack.tsx:232` ne montre plus "Stressed (bear) 5.6%" en point unique — passé à `stressedBearRange: {low, high}` (bande ±0.4pt autour du center, commenté méthodologie).
- `docs/spec/00-vision.mdx:18` + `agents/system-prompts/review.ts:10` : les mentions "reference point ~12%" / "(réf ~12%)" remplacées par "APY target range 9.4–12.8%".
- Tests portfolio mis à jour.

### Cluster 8 — PTAI format
- 4 surfaces nouvellement PTAI-compliant : `RebalancingActions` (Scenario Lab), PDF `btc-tactical` (4 lignes P/T/A/I au lieu de 3), Governance Proposal Detail (bloc `<Ptai>` conditionnel), schéma Zod `ScenarioNarrativeOutput` exige désormais les 4 champs.
- Validator `assertNoForbiddenWords` appliqué sur chaque champ PTAI dans l'agent scenario-narrative.

### Cluster 9 — Portfolio LP coherence
- **3 formules monthly return → 1** : `src/lib/portfolio/monthly-return.ts` canonique (NAV + dist add-back). `returns.ts` et `engine/lp-pnl.ts` y délèguent.
- **Share class hardcoded "A" → `getShareClassForPosition()`** qui lit `vaultDeployment.shareClass` (fallback A avec TODO Prisma).
- **`getTaxPreview` wired** : bouton "Preview 1099 / CRS" du portfolio ouvre `TaxDocsDrawer` alimenté par les vraies distributions YTD.

### Cluster 10 — Attestation signer allowlist
- `verifyStoredAttestation` refactor en 3 checks ordonnés : signature → allowlist → digest+signer.
- **Fail-closed prod garanti** : pas d'allowlist en prod = rejet automatique. `ATTESTATION_DEV_ACCEPT_ANY=1` ignoré en prod.
- 6 nouveaux tests dédiés (26/26 verts).

---

## 4 · Phase démon (avant les clusters)

À la demande explicite d'Adrien ("supprime le démon, fallbacks zéro, pas de faux chiffres"), exécuté avant la phase fix :

- **Suppression complète** du demo system : 5 fichiers `src/lib/demo/`, 2 composants `src/components/demo/`, 1 action `src/app/actions/demo.ts`, var env `DEMO_MODE_DEFAULT`, toggle admin.
- **Helper pur projection** déplacé hors `lib/demo/` (arithmétique pure n'avait rien à faire dans demo) → `src/lib/projection-chart.ts`.
- **10 importateurs recâblés** vers `@/lib/data/*` direct.
- **Fallbacks à zéro dans `data/portfolio.ts`** : RiskPulse plus de multiplicateurs inventés `composite × 0.95/0.85/...`, LockMeter plus de 60d/150bps hardcodés, ProofPulse plus de methodology v1.0/Spearbit hardcodés (branches vide ET populée).
- **`data/vaults.ts`** : FIXTURE_VAULTS et HEARST_YIELD_VAULT_FIXTURE supprimés. DB vide ou erreur → `[]` / `null`.
- **Wipe dev.db** : 228 rangées seedées effacées (Allocation 140, VaultSnapshot 35, MiningMetric 30, Proof 11, RebalanceEvent 8, Distribution 4) via `scripts/wipe-seeded-data.ts`. Auth tables intactes.

---

## 5 · État de la conformité après ce sprint

| Non-négociable CLAUDE.md | État avant | État après |
|---|---|---|
| #1 APY toujours range | 2 P0 LP-facing | ✅ Type-locked + UI + spec + prompts nettoyés |
| #2 Provenance badge sur chaque métrique | PDF & statements à 0 | ✅ 30+ métriques badgées, freshness centralisée |
| #3 PTAI mandatory | 4 surfaces non-conformes | ✅ Schéma Zod enforce, 4 surfaces wirées |
| #5 Forbidden words | Liste divergente entre 5 lieux, regex laxiste | ✅ Module canonique unique, 46 tests |
| #6 Engine pur | OK | ✅ Reste OK |
| #7 Méthodologie versionnée | Collision v2.0 / v2.0-draft | ✅ v2.0 ratifié + v2.1-draft, agents version-aware |
| #10 "not guaranteed" + assumptions | OK côté disclaimers, MC PCA pas corrélée | ✅ Corrélation Cholesky implémentée |

---

## 6 · Findings reportés (hors scope de ce sprint)

- **Engine `METHODOLOGY_VERSION` à `v2.0`** dans `engine/scenario.ts:19` + tests/snapshots (cluster 1 P1-1, scope engine-dev).
- **`MonteCarloOutput.methodologyVersion`** à persister en DB (Prisma) — cluster 1 P0-3.
- **`loadMemoInput` multi-vault** : `loaders/vault.ts:90-93` mixe Yield snapshot avec presets defensive/btc-plus — cluster 3 P0.
- **MC paths : `runMonteCarlo` UI utilise `runs: 1000`** alors que `v2.0.md` annonce 10 000 — cluster 1, scope engine.
- **CLAUDE.md §5 + `docs/spec/09-agents.mdx`** : encore 5 mots écrits ; le runtime en a 6 (super-ensemble) — alignement spec à faire par Adrien.
- **Stemming forbidden words** : `promising` (drop du `e` de `promise`) n'est pas matché. Trade-off explicite (FP `promotion`/`promoter`) — à reconsidérer si incident.
- **Position.shareClass** à modéliser proprement en Prisma (cluster 9 TODO inline).
- **Tests intégration `/portfolio` empty-state** : à ajouter pour figer la garantie "no fake numbers".

---

## 7 · Vérifications finales

```
pnpm typecheck   ✅ 0 erreurs
pnpm lint        ✅ 0 erreurs
pnpm test --run  ✅ 127/127 fichiers · 1758/1758 tests
```

Aucun import `@/lib/demo`, `DemoModeToggle`, `withDemoFallback`, `FIXTURE_VAULTS`, `HEARST_YIELD_VAULT_FIXTURE` ne subsiste.

---

## 8 · Diff par grande zone

```
docs/methodology/         renommage v2.0-draft → v2.1-draft + agent dynamic
docs/spec/00-vision.mdx   nettoyage "~12%"
src/app/(product)/        portfolio: TaxDrawer wired, demo loaders → data directs
src/app/admin/            distributions: colonne Source ; layout: demo toggle out
src/lib/agents/           forbidden-words canonique, methodology dynamic, PTAI schema
src/lib/attestation/      verify: 3 checks ordonnés + allowlist + fail-closed prod
src/lib/data/             energy-cost.ts, risk-free-rate.ts, freshness.ts créés
                          btc-price.ts: Chainlink primary
                          portfolio.ts: invented numbers tués
                          vaults.ts: fixtures retirés
src/lib/engine/           monte-carlo: Cholesky ρ ; types: apyMedianInternal
src/lib/pdf/              memo-pages × 8 + statements: badges provenance
src/lib/portfolio/        monthly-return.ts canonique, tax wired
prisma/dev.db             228 rangées seedées effacées
```
