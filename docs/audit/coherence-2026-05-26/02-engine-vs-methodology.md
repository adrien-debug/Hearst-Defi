# Audit cohérence — Engine ↔ Méthodologie

**Date** : 2026-05-26
**Auditeur** : Claude Opus 4.7 (read-only)
**Périmètre** : `src/lib/engine/*.ts` vs `docs/methodology/v1.0.md` + `docs/methodology/v2.0.md`
**Mode** : read-only, aucune modification de code

---

## Résumé exécutif

L'engine implémente correctement les **piliers structurels** de la méthodologie (PRNG seedé v2.0, hashprice dérivé jamais sampled, hashrate canonique, range APY low/high, ratios pure-function, forbidden-words guard). Mais il existe **des divergences silencieuses graves entre v1.0 (référence légale, immuable) et l'implémentation**, qui exposent le track-record si elles passent en mémoire LP.

**Verdict synthétique** :

- **3 P0** — formules clés divergent ou inventent des constantes hors méthodologie ; un chemin de code émet un point unique (apyMedian) en violation directe du non-négociable #1.
- **6 P1** — formules implémentées sans ancrage dans la méthodologie (smart contract baseline, counterparty baseline, BTC drift par hashprice, miningApyBps invest_usd_per_th = 120, score market 1.2/0.3/40, share class B lockup).
- **5 P2** — nommage incohérent (`stressed_apy` mono-point alors que la méthodologie le qualifie de "stressed APY = same engine under Bear preset"), duplication forbidden-words × 3, commentaires obsolètes.

**Conformité des règles dures CLAUDE.md** :
- #1 (APY range) : **violation** dans `ScenarioResult` (`apyMedian` est un point unique stocké + exporté).
- #6 (pureté engine) : **OK** — aucun `Math.random()` / `Date.now()` / `fetch` / `process.env` détecté dans `src/lib/engine/*`.
- #7 (MC seed injecté) : **OK** — `createPrng(seed)` reçoit `seed` en input explicite, jamais module-level.
- Forbidden words : **OK** mais dupliqué 3 fois (TECH DEBT déjà documenté).

---

## Mapping formule → engine module → méthodologie §

### v1.0 (rule-based, immuable)

| Formule méthodologie | Section | Engine module | Symbole code | Conformité |
|---|---|---|---|---|
| `projected_apy = Σ alloc_pct(b) × forward_yield(b)` | v1.0 §Yield projection | `scenario.ts:projectedApyPct` + `rebalancing.ts:deriveAllocations` | `projected_apy_pct` | OK — somme bps/100 |
| Mining : `net_distributable = hashprice × hashrate × revenue_share − costs`, annualisé 30j | v1.0 §Yield projection | `mining.ts:computeMiningRevenue` + `rebalancing.ts:miningApyBps` | `net_margin_usd_th_day` | **Partiel** — méthodologie cite `revenue_share` + `annualised over 30d` ; engine n'a ni `revenue_share` (UPTIME_ASSUMPTION=0.98 fixe), ni rolling 30d (constante `invested_usd_per_th = 120` non documentée). |
| USDC base : weighted T-bills + lending APY 30j | v1.0 §Yield projection | `rebalancing.ts:usdcBaseBps` | `RWA_LIKE_USDC_BASE_BPS=480` | **Divergence** — méthodologie demande moyenne pondérée live ; engine = constante 480 bps + entrée `stable_apy_pct` − 200 bps fixe. |
| BTC tactical : `P&L = 0 base, computed by tactical rules` | v1.0 §Yield projection | `rebalancing.ts:btcTacticalBps` | tiers `1800/900/200/-200/-600` bps | **Divergence** — méthodologie pose 0 en base ; engine retourne `+200 bps` au lieu de 0 dans la branche par défaut. |
| Stable reserve : USDC native ~4.5% conservative | v1.0 §Yield projection | `rebalancing.ts:STABLE_RESERVE_BPS=450` | constante 450 | OK |
| `apy_low = projected × (1 − risk_factor)` ; `apy_high = projected × (1 + upside_factor)` | v1.0 §APY range | `scenario.ts:buildApyRange` | `ASSUMPTION_RISK_FACTOR=0.20` / `ASSUMPTION_UPSIDE_FACTOR=0.18` | **Partiel** — méthodologie fixe les **bornes** (risk ∈ [0.10, 0.30], upside ∈ [0.10, 0.25] symétrique) ; engine fige des valeurs constantes (0.20 / 0.18) au lieu d'une fonction de timeframe et de freshness. |
| Stressed APY = même engine sous preset Bear | v1.0 §Stressed APY | `scenario.ts` ligne 128 : `apy_range.low * BEAR_STRESS_FACTOR` | `BEAR_STRESS_FACTOR=0.65` | **Divergence majeure** — méthodologie dit "computed via the same engine under Bear preset assumptions" ; engine V1 fait un simple multiplicateur scalaire `low × 0.65`, jamais re-runner sous preset `btc_bear`. |
| Confidence : 40% freshness / 30% historical fit / 20% out-of-range / 10% rebalancing room | v1.0 §Confidence | `scenario.ts:deriveConfidence` | seuils `vol_index ≥75 → low`, `≥50 → medium` | **Divergence** — méthodologie pose 4 facteurs pondérés explicites ; engine retourne un binaire vol_index/spread sans aucune trace des 4 poids. |
| Provenance ladder (Live/Oracle/Attested/Estimated/Manual/Stale) | v1.0 (cité v2.0 §5) | `vaults.ts:Provenance` | type union | OK |
| Forbidden words (#5) | v1.0 §Forbidden | dupliqué dans `scenario.ts`, `btc-tactical.ts`, `backtest.ts`, `rebalancing-rules.ts` | `FORBIDDEN_WORDS` | OK (P2 duplication) |
| Disclaimer templated | v1.0 §Disclaimers | `scenario.ts:buildAssumptions` ligne 203, `scenario.ts:disclaimer` ligne 391 | string | **Partiel** — texte engine ≠ texte méthodologie (mention "Cayman Exempted LP", "minimum subscription", "jurisdictional restrictions" absents du V2 disclaimer). |

### v2.0 (Monte Carlo)

| Formule méthodologie | Section | Engine module | Symbole code | Conformité |
|---|---|---|---|---|
| BTC = GBM `dS = μS dt + σS dW` | v2.0 §Inputs / §Output | `monte-carlo.ts` ligne 135–151 | `muStep`, `sigmaStep`, `nextGaussian` | OK — formulation log-step correcte avec correction d'Itô `−0.5σ²`. |
| Difficulty = mean-reverting bounded | v2.0 §Inputs | `monte-carlo.ts` ligne 153–158 | `reversionSpeed`, `diffFloor/diffCeil` | OK — OU-step Euler explicite. |
| Hashprice dérivé (jamais sampled) | v2.0 §Inputs | `monte-carlo.ts` ligne 160 : `deriveHashpriceUsdPerThDay(diff, price)` | shared `hashprice-formula.ts` | OK |
| BTC/difficulty correlation ρ | v2.0 §Inputs + draft §2.4 | `monte-carlo.ts` | aucune corrélation implémentée | **P0** — `zBtc` et `zDiff` sont tirés indépendamment ; aucune matrice de Cholesky ni `ρ`. Méthodologie v2.0 dit explicitement "correlated Wiener increment". |
| Energy cost = contractual + small noise | v2.0 §Inputs | absent | — | **P1** — `costPerThDay` est passé en input mais figé per-run, jamais bruité comme la méthodologie le spécifie. |
| Stable APY = low-vol normal autour mean 36m | v2.0 §Inputs | `monte-carlo.ts` ligne 167–168 | `stableApyMean + stableApyVol × z` | OK |
| Seed PRNG explicit input, no Math.random/Date.now | v2.0 §Determinism | `prng.ts` + `monte-carlo.ts:input.seed` | `createPrng(seed)` | **OK — conforme CLAUDE.md #7** |
| Default N = 10 000 (v2.0 ratifié) ou 1 000 (draft) | v2.0 §Determinism / draft §2.3 | `monte-carlo.ts` ligne 19 | `DEFAULT_PATHS = 10_000` | OK vs v2.0 ratifié ; **incohérence** avec le draft (1 000). |
| Calibration window 36m sur VaultSnapshot+MiningMetric | v2.0 + draft §2.5 | absent | — | **P0** — aucun module `calibration.ts` ; la méthodologie demande Step 1–5 (load, log-returns, μ/σ/ρ, gap flag, immutable config). Tout est délégué au caller, sans contrat ni typage. |
| Fallback si window < 6m → MC bloqué | draft §2.5 | absent | — | **P1** — aucune garde dans l'engine. |
| Headline = `[p25, p75]` (jamais point unique) | v2.0 §Output | `monte-carlo.ts:headlineRange` | `{ low: p25, high: p75 }` | OK |
| Reporting : p5, p50, p95 + `P(apy < floor)` | v2.0 §Output | `monte-carlo.ts:percentiles` + `probBelowFloor` | OK | OK |
| Confidence dégrade si calibration window < 12m ou >10% paths hors P5-P95 | v2.0 §Confidence / draft §2.7 | absent | — | **P1** — l'engine ne lit pas la fenêtre de calibration et ne flag pas les paths hors P5-P95 historique. |
| Side-by-side rule-based + MC, jamais blended | v2.0 §APY range vs rule-based | engine retourne 2 modules séparés (`scenario.ts` + `monte-carlo.ts`) | — | OK côté engine ; conformité réelle dépend de l'UI (hors scope audit). |

### Hashprice formula partagée

| Formule | Engine | Conformité |
|---|---|---|
| `network_hashrate_ths = difficulty × 2³² / 600 / 1e12` | `hashprice-formula.ts:networkHashrateThs` | OK (constantes nommées, block_reward=3.125 post-halving 2024) |
| `hashprice = reward × 144 × btc / hashrate` | `hashprice-formula.ts:deriveHashpriceUsdPerThDay` | OK |

### Ratios statistiques

| Ratio | Méthodologie | Engine | Conformité |
|---|---|---|---|
| Sharpe annualisé | v1.0 §Forbidden ("Advanced mode only") | `ratios.ts:calcSharpe`, exposé `risk.ts:computeSharpe` | OK formule ; **P1** — non cité dans la méthodologie comme formule canonique (juste mention "Advanced mode"). |
| Sortino annualisé | idem | `calcSortino` | idem P1 |
| VaR 95% historique | idem | `calcVaR` | idem P1 |
| Max drawdown | v1.0 absent ; spec 02 §"Max drawdown estimate" | `calcMaxDrawdown` + `drawdown.ts:computeDrawdownPeriods` | OK |
| Calmar | non cité | `calcCalmar` | **P1** — pas dans la méthodologie. |

---

## Findings P0 / P1 / P2

### P0 — divergence silencieuse / risque légal

**P0-1 — `apyMedian` est un point unique exporté en sortie d'engine (viole non-négociable #1)**
`src/lib/engine/scenario.ts:399`, `src/lib/engine/types.ts:116, 127` : `ScenarioResult` contient `apyMedian: number` ET `ScenarioDelta.apyMedian` ; ces valeurs sont consommées par `compareScenarios()` et par les tests (`__tests__/scenario.test.ts`). Méthodologie v1.0 §APY range : "**No single-point APY is ever published**". v2.0 §Output : "**No single-point APY is ever published**, MC or not". Même si l'UI ne l'affiche pas aujourd'hui, l'engine retourne un point ; un consommateur (memo PDF, statement, agent) peut le sérialiser sans haircut. **Risque CYA** : un LP voit `apyMedian: 11.4` dans un dump → contradiction directe avec le standard.

**P0-2 — Monte Carlo sans corrélation BTC/difficulty**
`src/lib/engine/monte-carlo.ts:150, 154` : `zBtc = prng.nextGaussian()` puis `zDiff = prng.nextGaussian()` — tirages **indépendants**. Méthodologie v2.0 §Inputs : "Geometric Brownian motion (drift μ, vol σ) ... correlated Wiener increment". Draft §2.4 : "dW = correlated Wiener increment, correlation ρ(BTC, difficulty) from historical data". L'engine ignore la corrélation alors que la méthodologie la rend obligatoire. Conséquence : distribution MC sous-estime la covariance des chocs (chute BTC + chute hashprice corrélées dans la réalité), donc sous-estime les queues de gauche → trompe l'investisseur sur le risque.

**P0-3 — `stressed_apy` calculé hors méthodologie (multiplicateur scalaire)**
`src/lib/engine/scenario.ts:128` : `const stressed_apy = round(apy_range.low * BEAR_STRESS_FACTOR, 2);` avec `BEAR_STRESS_FACTOR = 0.65` (constante magique sans source). Méthodologie v1.0 §Stressed APY : "Combined scenario: BTC −40% + Hashprice −30% + Mining margin compression. **Computed via the same engine under Bear preset assumptions**." L'engine devrait appeler `runScenario(getPresetInputs("btc_bear"))` puis ressortir l'`apy_range.low` du résultat — il fait à la place un simple `× 0.65` sur le low courant. Diverge silencieusement dès que le preset Bear change (et il pourrait l'instant prochain : `0.65` ≠ `0.60` du multiplicateur stress V2 ligne 247).

### P1 — formule présente mais hors méthodologie

**P1-1 — `invested_usd_per_th = 120` (rebalancing.ts:96) non documenté**
Hard-coded magic number. Méthodologie v1.0 demande `mining_revenue × revenue_share − costs / capital deployed`, sans citer 120. Pas de provenance.

**P1-2 — Smart contract baseline `80` (risk.ts:13) — pre-audit**
Aligné avec spec `08-risk-framework.mdx` ("Pre-audit: 80"), **mais** ne réside dans aucune méthodologie versionnée. Risque : audit Spearbit terminé → l'engine continue à retourner 80 (pas de bascule vers 30) ; spec lui-même n'est pas verrouillé immuable.

**P1-3 — Counterparty baseline `35` (risk.ts:15) — pas dans méthodologie**
Pas dans v1.0/v2.0. La spec dit "🟢 <30 / 🟠 30–55 / 🔴 >55" mais ne fixe pas de baseline. 35 → niveau orange par défaut, sans justification documentée.

**P1-4 — `scoreMarket` constantes magiques `1.2 / 0.3 / 40 / 20` (risk.ts:55–59)**
Aucune trace dans méthodologie. Le coefficient drawdown `1.2` et le coefficient upside `0.3` posent une asymétrie qui n'est référencée nulle part.

**P1-5 — Mining health : Hashprice Trend + Operational Confidence non implémentés**
Spec `05-mining-model.mdx` définit explicitement `trend_pct = (avg_30d / avg_60d − 1) × 100` et la formule pondérée 50/30/20 d'Operational Confidence. Engine n'implémente **que** Mining Margin Score. `mining.ts:computeOperationalConfidence` est un "Simplified placeholder" reconnu en commentaire (lignes 25–34). v1.0 §Confidence ne cite pas ces deux scores → ils ne sont pas légalement obligatoires mais la spec produit les surface en Dashboard.

**P1-6 — Share Class B lockup `90 days` vs draft v2.0 = `30 days`**
`share-class.ts:34` : `softLockupDays: 90`. v2.0-draft §4.2 : "Class B soft lock-up: **30 days**". Mgmt fee Class B code = `75 bps`, draft = `100 bps`. Perf fee Class B code = `800 bps`, draft = `1000 bps`. **Multiple divergences** sur les paramètres B ; doc et code ne se voient pas. (Le draft v2 n'est pas ratifié → P1 et non P0, mais à recadrer avant publication.)

### P2 — naming / commentaires / duplications

**P2-1 — `FORBIDDEN_WORDS` dupliqué 4 fois**
`scenario.ts:28`, `btc-tactical.ts:14`, `backtest.ts:14`, `rebalancing-rules.ts:145`. Déjà reconnu en TECH DEBT dans les commentaires ; pure architecture (l'engine ne peut pas importer `src/lib/agents/*`). Solution : extraire `src/lib/engine/forbidden-words.ts` pur. Le linter agent (`src/lib/agents/validators.ts`) reste canonique, le module engine est miroir.

**P2-2 — `stressed_apy` (snake_case) vs `stressedApy` (camelCase) — deux contrats divergents**
`ScenarioOutput.stressed_apy` (snake) vs `ScenarioResult.stressedApy` (camel). Deux modes d'API (v1 ScenarioInputs / v2 ScenarioParams) qui sortent deux conventions de nommage différentes pour la même grandeur → trompeur pour un consommateur.

**P2-3 — `BEAR_STRESS_FACTOR = 0.65` vs `STRESS_BTC_MULTIPLIER = 0.6` (scenario.ts:38, 247)**
Deux constantes voisines, deux conventions, dans le même fichier. Aucune n'est citée par la méthodologie (P0-3) ; ici juste l'incohérence de nommage et de valeur.

**P2-4 — Commentaire obsolète sur `EXPOSURE_CAP_PCT = 30` (btc-tactical.ts:43)**
Pas de référence à la spec 06 (`Position size > 10% AUM` post T1). Le `30%` cap est cohérent avec les bandes opportunistes "20–30%" de spec 07 mais non explicité.

**P2-5 — `methodology_version=v1.0` figé en V2 path (scenario.ts:19)**
`runScenarioV2` sort aussi `methodology_version=v1.0` (ligne 345), alors qu'il utilise des constantes V2 (`MONTHLY_USDC_YIELD`, `STRESS_BTC_MULTIPLIER`, etc.). Si Methodology v2.0 est ratifiée pour MC, le path V2 (`runScenarioV2`) doit estamper `v2.0`. Confondre les deux versions sur un memo = faute d'audit.

---

## Constantes magiques non documentées

Liste exhaustive (engine module → ligne → constante → présence méthodologie) :

| Module | Ligne | Constante | Valeur | Documenté ? |
|---|---|---|---|---|
| `mining.ts` | 3 | `REFERENCE_EFFICIENCY_KWH_PER_TH_DAY` | 0.1 | ❌ |
| `mining.ts` | 4 | `HOSTING_AND_POOL_FEE_USD_TH_DAY` | 0.005 | ❌ |
| `mining.ts` | 5 | `TARGET_NET_MARGIN_USD_TH_DAY` | 0.04 | ❌ (spec 05 cite `target_margin` symbolique) |
| `mining.ts` | 6 | `UPTIME_ASSUMPTION` | 0.98 | ⚠️ commentaire "paper phase" |
| `btc-tactical.ts` | 23 | `ACCUMULATE_DRAWDOWN_PCT` | -20 | ✅ spec 06 |
| `btc-tactical.ts` | 24 | `ACCUMULATE_VOL_MAX` | 60 | ❌ |
| `btc-tactical.ts` | 25 | `TAKE_PROFIT_RUN_PCT` | 40 | ❌ (spec 06 cite +30/+60 pour T1/T2) |
| `btc-tactical.ts` | 26 | `REDUCE_SIZE_VOL_MIN` | 80 | ❌ (spec 06 cite vol > 90 pour R-BTC-5) |
| `btc-tactical.ts` | 28-31 | seuils vol/margin | 80/65/70/50 | ❌ |
| `btc-tactical.ts` | 34-38 | `BASE_TARGET_BY_MODE` | 5/12/22 | ❌ — spec 07 cite des bandes (0-10/10-20/20-30), pas un point cible. |
| `btc-tactical.ts` | 40-43 | multiplicateurs | 0.5/0.75/1.1, cap 30 | ❌ |
| `rebalancing.ts` | 8-11 | seuils mode | 65/50/40/75 | ⚠️ partiel (cité spec 08 thresholds mais pas la combinaison) |
| `rebalancing.ts` | 34 | `RWA_LIKE_USDC_BASE_BPS` | 480 | ❌ |
| `rebalancing.ts` | 35 | `STABLE_RESERVE_BPS` | 450 | ✅ v1.0 ("~4.5%") |
| `rebalancing.ts` | 96 | `invested_usd_per_th` | 120 | ❌ |
| `rebalancing.ts` | 102-106 | tiers BTC bps | 1800/900/200/-200/-600 | ❌ |
| `risk.ts` | 4-8 | poids risques | 0.30/0.25/0.15/0.20/0.10 | ✅ spec 08 |
| `risk.ts` | 13 | `SMART_CONTRACT_BASELINE_PRE_AUDIT` | 80 | ✅ spec 08 |
| `risk.ts` | 15 | `COUNTERPARTY_BASELINE` | 35 | ❌ |
| `risk.ts` | 55-58 | coefficients market score | 1.2/0.3/40/20 | ❌ |
| `risk.ts` | 62-66 | coefficients mining/energy score | 0.085/600/-30/60, 0.045/800/-10/50 | ❌ |
| `risk.ts` | 71-74 | coefficients liquidity | 25/3/-5/15 | ❌ |
| `scenario.ts` | 37 | `MIN_APY_SPREAD_BPS` | 50 | ❌ (proche de v1.0 esprit "range" mais non chiffré dans la méthodologie) |
| `scenario.ts` | 38 | `BEAR_STRESS_FACTOR` | 0.65 | ❌ (P0-3) |
| `scenario.ts` | 40-41 | risk/upside factors | 0.20 / 0.18 | ⚠️ dans la fourchette v1.0 ([0.10, 0.30] et [0.10, 0.25]) mais figés, pas dynamiques |
| `scenario.ts` | 234-235 | yields fixes | 0.048/12, 0.045/12 | ❌ |
| `scenario.ts` | 242-244 | proxy BTC monthly | 0.05/0.003/-0.005 | ❌ |
| `scenario.ts` | 247-248 | stress multipliers V2 | 0.6/0.7 | ❌ (P0-3) |
| `monte-carlo.ts` | 19 | `DEFAULT_PATHS` | 10 000 | ✅ v2.0 ratifié ; ⚠️ contradictoire avec draft (1 000) |
| `monte-carlo.ts` | 94 | `STEPS_PER_YEAR` | 12 | ✅ implicite (horizonMonths) |
| `share-class.ts` | 22-29 | Class A | 1%+10% / 60j / $250k | ✅ aligné CLAUDE.md (mention "250k min ticket") |
| `share-class.ts` | 31-38 | Class B | 0.75%+8% / 90j / $1M | ❌ diverge draft v2.0 (1%+10% / 30j) |

---

## Recommandations (par priorité)

1. **(P0-1)** Retirer `apyMedian` de `ScenarioResult` et `ScenarioDelta`, OU renommer en `apyMedianInternalDebug` avec doc explicite "NEVER serialize to LP-facing output" + lint rule qui interdit son export hors engine. Adapter les tests (`scenario.test.ts:47,113,167,189`).

2. **(P0-2)** Implémenter la corrélation BTC/difficulty dans `monte-carlo.ts` : décomposition de Cholesky de la matrice 2×2 `[[1, ρ], [ρ, 1]]`, `zBtc = z1`, `zDiff = ρ·z1 + √(1-ρ²)·z2`. Ajouter `correlation: number` à `MonteCarloInput`. Mettre à jour `BtcGbmAssumptions`/`DifficultyAssumptions`.

3. **(P0-3)** Remplacer `stressed_apy = apy_range.low × 0.65` par un appel `runScenario(getPresetInputs("btc_bear"), { vault, now }).apy_range.low`. Supprimer `BEAR_STRESS_FACTOR`. Faire la même chose pour `runScenarioV2` (preset Bear sur ScenarioParams équivalent).

4. **(P1-1, P1-3, P1-4)** Créer un module `src/lib/engine/constants.ts` (pure) qui regroupe **toutes** les constantes magiques avec, pour chacune, un commentaire `@source: docs/methodology/v1.0.md §X` ou `@source: docs/spec/0X.mdx ligne Y`. Bloquer en lint toute constante numérique > 1 littérale dans les fichiers engine sans annotation source.

5. **(P1-5)** Soit implémenter `computeHashpriceTrend()` + `computeOperationalConfidence()` complets dans `mining.ts` (la spec 05 les définit), soit retirer les commentaires "placeholder" et déclarer V2 scope.

6. **(P1-6)** Aligner share-class.ts sur la version active : si v2.0-draft pas ratifié, ne pas afficher Class B en prod ; si ratifié, mettre à jour code (90→30 jours, 75→100 bps, 800→1000 bps).

7. **(P1 MC calibration)** Créer `src/lib/engine/calibration.ts` (pure) : `calibrateFromHistory(rows: VaultSnapshot[], window: number) → MonteCarloInput["btc"|"difficulty"|"yield"]` avec contract de garde "< 6m → throw, < 12m → flag low confidence". Fait le pont méthodologie §2.5 et l'engine.

8. **(P2-1)** Extraire `src/lib/engine/forbidden-words.ts` pur ; les 4 duplications l'importent. Le linter agent (`validators.ts`) reste source canonique mais peut l'importer aussi via un alias inversé.

9. **(P2-5)** Stamper `methodology_version=v2.0` dans `runScenarioV2` quand la méthodologie v2.0 est ratifiée. Sinon, retirer `runScenarioV2` du chemin LP.

10. **(P2-2/2-3)** Standardiser sur camelCase pour toutes les sorties engine V2+ (`stressedApy`, `apyRange.low`, `riskScore`, …) et marquer `ScenarioOutput` (snake_case) comme deprecated.

---

## Annexe : règle "APY range" — preuve d'audit

Grep `apy:` dans `src/lib/engine/` → **1 hit** : `types.ts:30 stressed_apy: number` (point unique, voir P0-3).
Grep `apyMedian` dans engine → **2 hits** dans `types.ts`, **2 hits** dans `scenario.ts`, 7 hits dans tests, 1 hit dans `data/defillama.ts` (apyMedianPct est une **donnée d'input** externe, pas une sortie engine → OK).

**Conclusion** : la règle est respectée *en surface* (apy_range/apyRange partout exposés) mais **violée latéralement** par `apyMedian` qui co-existe en sortie publique.

---

## Annexe : règle "PRNG seed must be injected"

`prng.ts` : `mulberry32(seed: number)` et `createPrng(seed: number)` reçoivent `seed` en argument explicite. Aucun `seed` module-level. Aucun `Math.random()`. Aucun `Date.now()`.
`monte-carlo.ts:127` : `createPrng(input.seed)` — input.seed est dans le contract `MonteCarloInput`.
**Conformité CLAUDE.md #7 : OK.**

---

*Audit terminé 2026-05-26 — read-only — aucune modif appliquée.*
