# 04 — Audit Cohérence : Ingestion (data layer) ↔ Méthodologie "Inputs"

**Date** : 2026-05-26
**Auditeur** : Claude Opus 4.7 (read-only)
**Sources** :
- `docs/methodology/v1.0.md` (§ "Inputs (sources)")
- `docs/methodology/v2.0.md` (§ "Inputs" — identique v1 + treatment stochastique)
- `src/lib/data/*` (19 fichiers)
- `src/lib/inngest/functions/*` (5 crons)
- `src/lib/chain/*`, `src/lib/attestation/*`
- `src/lib/mock/*` (3 fichiers)

---

## Résumé exécutif

La méthodologie v1.0 déclare **8 variables d'input** avec sources primaires + fallbacks + fréquences. Le code de data layer en couvre **3 réellement (BTC price, difficulty, hashprice)**, **2 partiellement (stable APY, T-bills)**, **3 pas du tout (energy cost, uptime %, RWA yield)**.

Constats majeurs :
1. **Aucune des sources "primaires" annoncées n'est utilisée** : la méthodologie promet Chainlink (BTC), Luxor (hashprice), Ondo (T-bills), Maple / Centrifuge (RWA). Le code utilise CoinGecko (qui est le *fallback* méthodologique) comme primaire pour BTC, dérive hashprice maison depuis mempool.space, et n'a aucune ingestion T-bills / RWA / Ondo / Maple / Centrifuge.
2. **Le fallback méthodologique "Coingecko" pour BTC est en réalité le primaire, sans deuxième niveau de fallback** : si CoinGecko tombe, on renvoie `usd: 0, stale: true` — pas de seconde source. Même chose pour mempool.space (pas de fallback `blockchain.info`).
3. **Provenance badge `Stale` n'est jamais émis dans l'UI** : `provenance-badge.tsx` connaît la valeur `"stale"` mais aucune source de données ne la pousse — les loaders flag `stale: boolean` interne mais le mapping vers le badge n'existe pas (sauf via `livePreview` / `source: "fallback"`).
4. **Fréquence cron BTC : méthodologie dit 1 min, cron tourne toutes les heures** = 60x trop lent.
5. **`risk-free rate` hardcodé à 0.045** dans `advanced-metrics.ts` avec deux TODO non résolus — input méthodologique critique (Sharpe / Sortino) sans source.

**Total findings** : **3 P0**, **5 P1**, **2 P2**.

---

## Table inputs : méthodologie → code → état

| Variable méthodologie | Primaire annoncé | Fallback annoncé | Fréq. annoncée | Fichier code | Vraie source utilisée | Vrai fallback | Fréq. réelle | État |
|---|---|---|---|---|---|---|---|---|
| **BTC price** | Chainlink BTC/USD oracle | Coingecko | 1 min | `src/lib/data/btc-price.ts` (`fetchBtcPrice`) | **CoinGecko** (`api.coingecko.com/api/v3/simple/price`) | aucun (renvoie `usd: 0, stale: true`) | **1 h** (`market-data-hourly` cron `0 * * * *`) | **P0 — primaire absent, pas de fallback, fréq. 60x trop lente** |
| **Network difficulty** | mempool.space | blockchain.info | per adjustment (~14j) | `src/lib/data/hashprice.ts` (fetchHashprice → mempool) | **mempool.space** (`/api/v1/mining/difficulty-adjustments/1m`) | constante codée en dur `1.32e14` (`FALLBACK_DIFFICULTY`) avec `stale: true` | 10 min (next.revalidate 600) | **P1 — fallback `blockchain.info` non implémenté** |
| **Hashprice ($/TH/day)** | Luxor / Hashrate Index API | manual | daily | `src/lib/data/hashprice.ts` (`deriveHashpriceUsdPerThDay`) | **dérivé maison** (BTC × difficulty × reward / hashrate) — *ni Luxor, ni Hashrate Index* | constante `0.055` USD/TH/day codée | 1 h (cron) | **P1 — source annoncée jamais appelée ; dérivation maison ≠ feed paid Luxor** (documenté dans le code, mais en divergence avec la méthodologie) |
| **Energy cost ($/kWh)** | partner contractual + spot index | contract | monthly | aucun fichier `*energy*` — **constante en 3 endroits** | `0.05` hardcodé : `market-data-hourly.ts:86,111`, `backfill.ts:15`, `rebalancing-signal.ts:72`, `risk-framework.ts:84` | n/a | n/a | **P0 — ingestion 100% absente, valeur statique** |
| **Uptime %** | partner monthly reporting (signed attestation) | — | monthly | `src/lib/attestation/*` existe (sign + verify) mais aucun loader d'attestation uptime | `98.5` hardcodé : `market-data-hourly.ts:112`, `backfill.ts:16` (`UPTIME_PCT`) | n/a | n/a | **P0 — toolkit attestation existe, pipeline d'ingestion uptime inexistant** |
| **Stable lending APY** | DefiLlama API (Aave, Compound) | direct RPC | daily | `src/lib/data/defillama.ts` (`fetchDefiLlama`) | **DefiLlama** `yields.llama.fi/pools` — *conforme* | constante `4.5%` codée (`FALLBACK_APY_PCT`), avec circuit breaker | 1 h (cron, dans `market-data-hourly` mais logged-only, jamais persistées) | **P1 — résultat fetché mais jamais consommé dans le risk/scenario engine** (cf. commentaire "no DB persist") |
| **T-bills yield** | Ondo Finance API | FRED 3M T-bill | daily | **aucun fichier** | n/a | hardcodé `0.045` (`RISK_FREE_RATE`, `SORTINO_TARGET` dans `advanced-metrics.ts`) | n/a | **P0 — source critique pour Sharpe/Sortino absente, TODO ligne 31 et 33** |
| **RWA yield** | Maple / Centrifuge endpoints | manual | daily | **aucun fichier** | n/a | n/a | n/a | **P1 — source absente du code ; pas de bucket RWA dans `Allocation` non plus** |

### Sources codées mais absentes de la méthodologie

| Source | Fichier | Type | Status |
|---|---|---|---|
| Crypto Fear & Greed Index (`api.alternative.me/fng`) | `src/lib/data/fear-greed.ts` | Sentiment | **P1 — ingestion fantôme** : fetchée toutes les heures dans `market-data-hourly` (logged-only), pas dans la table "Inputs" v1.0 |
| Fireblocks Vault Accounts (read-only Viewer key) | `src/lib/data/custody.ts` + `custody-aggregate.ts` | Custody/PoR | **P2 — utile (PoR) mais hors table "Inputs"** : carry son propre `provenance: "live" | "manual"`, justifié pour Proof Center mais pas documenté dans methodology |
| EventLogger / PoRRegistry on-chain (Base Sepolia, viem) | `src/lib/chain/event-logger.ts`, `por-registry.ts` | On-chain proof | **P2 — légitime (Phase 2)** mais devrait apparaître dans v1.0 §Inputs au titre "oracle on-chain" |
| Synthetic backfill (CoinGecko daily + déterministe) | `src/lib/data/history.ts` | Historique 36m | Légitime pour MC v2.0 (`calibration window`), pas une "live" input |

---

## Findings P0 / P1 / P2

### P0 — Bloquants méthodologie

**P0-01 — Chainlink BTC/USD jamais appelé**
- Fichier : `src/lib/data/btc-price.ts`
- Constat : méthodologie v1.0 ligne 16 dit "Chainlink BTC/USD oracle" comme primaire. Le code n'appelle que `https://api.coingecko.com/api/v3/simple/price`. CoinGecko est le *fallback* annoncé, pas le primaire.
- Impact : l'attribut `Oracle` du provenance badge ne peut jamais être émis pour le prix BTC ; toute la chaîne (risk-framework, rebalancing-signal, dashboard, agents mining-health) consomme un prix sans signature on-chain.
- Reco : ajouter un lecteur Chainlink via viem (`AggregatorV3Interface.latestRoundData()` sur Base / Ethereum), CoinGecko en fallback réel. Voir aussi P0-04.

**P0-02 — Ingestion energy cost 100% absente**
- Fichiers : `market-data-hourly.ts:86,111`, `backfill.ts:15`, `rebalancing-signal.ts:72`, `risk-framework.ts:84`
- Constat : la valeur `0.05` USD/kWh est codée en dur dans 4 fichiers distincts. Aucun fichier `src/lib/data/energy*.ts`. La méthodologie ligne 19 promet "partner contractual + spot index" mensuel.
- Impact : Mining Health Agent + risk framework + rebalancing signaux R-* consomment une constante figée — variation réelle (en 2024-2026, $/kWh oscille de 0.035 à 0.085) totalement invisible. Le `mining_margin_score` est en partie déterministe sur cet input.
- Reco : créer `src/lib/data/energy-cost.ts` avec loader Partner-attestation (signed JSON, cadence mensuelle) + EIA spot fallback. Stocker dans une nouvelle table `EnergyCost` (ou colonne `EnergyAttestation`).

**P0-03 — Ingestion T-bills / risk-free 100% absente**
- Fichier : `src/lib/data/advanced-metrics.ts:31-34`
- Constat : `RISK_FREE_RATE = 0.045` et `SORTINO_TARGET = 0.045` codés en dur, avec deux TODO `source from config/oracle` non résolus. Méthodologie ligne 22 : "Ondo Finance API, FRED 3M T-bill fallback".
- Impact : Sharpe + Sortino + Calmar (tous les ratios institutionnels dashboard) calculés contre une benchmark statique. Si la BCE/Fed bouge, le numérateur de Sharpe est faux.
- Reco : créer `src/lib/data/t-bills.ts` avec Ondo API primaire (`https://api.ondo.finance/...`), FRED `DGS3MO` fallback (gratuit, API key publique).

### P1 — Régressions à corriger

**P1-01 — Crons : fréquence BTC 60× trop lente**
- Fichier : `src/lib/inngest/functions/market-data-hourly.ts:26` (cron `"0 * * * *"`)
- Constat : méthodologie dit `BTC price 1 min`, cron tourne toutes les heures. `fetchBtcPrice` cache local `next: { revalidate: 60 }` = max 1 min, mais le cron qui *persiste* dans `MiningMetric` ne se réveille qu'une fois par heure.
- Impact : `RebalanceSignal` R-BTC-1 (accumulation à −20%) peut rater une bougie de 20 min ; PTAI projection désynchronisée du marché.
- Reco : créer cron `market-data-1min` dédié au tick BTC (fetch + persist), garder `market-data-hourly` pour les agrégations.

**P1-02 — Fallbacks méthodologiques non implémentés**
- `src/lib/data/btc-price.ts` : aucun appel de secours quand CoinGecko down (renvoie 0, stale). Pas de second oracle.
- `src/lib/data/hashprice.ts` : pas de `blockchain.info` quand mempool.space down (utilise constante figée).
- `src/lib/data/defillama.ts` : pas de "direct RPC" Aave/Compound quand DefiLlama down (constante 4.5%).
- Impact : un seul point de défaillance par source = SLO degradé. Méthodologie promet une seconde source réelle, le code une constante.

**P1-03 — DefiLlama fetché mais jamais persisté**
- Fichier : `market-data-hourly.ts:53-65`
- Constat : `fetchDefiLlama()` + `fetchFearGreed()` appelés mais commentaire ligne 51 "logged only, no DB persist". Le risk-engine / scenario-engine continuent d'utiliser le proxy `STABLE_APY_PROXY_PCT = 4.5` dans `risk-framework.ts:93`.
- Impact : le yield Aave/Compound réel (variable de 2% à 7% selon utilisation) ne pondère jamais `projected_apy`.

**P1-04 — Fear & Greed = ingestion fantôme**
- Fichier : `src/lib/data/fear-greed.ts`
- Constat : Fear & Greed Index ingéré toutes les heures (cron), pas dans méthodologie v1.0 ni v2.0 "Inputs".
- Impact : si elle alimente une décision (à vérifier — apparemment elle n'alimente rien et reste log-only), elle doit figurer dans la méthodologie. Sinon supprimer pour éviter dette.

**P1-05 — Provenance badge `Stale` jamais émis dans l'UI**
- Fichiers : `src/components/ui/provenance-badge.tsx` (valeur connue), aucun consumer.
- Constat : tous les loaders maintiennent un boolean `stale` interne (btc-price, hashprice, defillama, fear-greed) mais aucune surface UI ne mappe `stale: true` → `<ProvenanceBadge kind="stale" />`. Le dashboard utilise `partial` ou `fallback` à la place.
- Impact : non-négociable CLAUDE.md #2 "every metric has a provenance badge: Live / Oracle / Attested / Estimated / Manual / **Stale**" partiellement respecté.

### P2 — Dette à surveiller

**P2-01 — Uptime hardcodé sans pipeline attestation**
- Fichiers : `market-data-hourly.ts:112` (`uptimePct: 98.5`), `backfill.ts:16`.
- Constat : la stack `src/lib/attestation/*` est mature (sign / verify / canonical / stored) mais aucun cron ne déclenche `parseAttestationPayload` pour pousser un uptime mensuel signé dans `MiningMetric`.
- Reco : créer cron `mining-attestation-monthly` qui consomme un payload signé partenaire, persiste un `Proof` + met à jour `MiningMetric.uptimePct`.
- Note : pas P0 car le toolkit est prêt, c'est la dernière ligne droite d'intégration.

**P2-02 — `deployedHashrate` hardcodé**
- Fichier : `market-data-hourly.ts:113` `deployedHashrate: 182_000` TH/s placeholder.
- Constat : pas dans méthodologie comme Input séparé (englobé dans hashprice formula), mais commentaire `// TH/s placeholder` traduit la dette.

---

## Crons : déclaré vs réel

| Cron Inngest | ID | Cron expr. | Fréq. réelle | Méthodologie attend | État |
|---|---|---|---|---|---|
| Market data | `market-data-hourly` | `0 * * * *` | 1h | BTC=1min, difficulty=per adjustment | **P1** — BTC 60× trop lent |
| Mining health daily | `mining-health-daily` | `0 8 * * *` | daily 08:00 UTC | uptime monthly (méthodo) | OK (agent quotidien légitime) |
| Risk daily | `risk-daily` | `30 9 * * *` | daily 09:30 UTC | n/a (cron agent) | OK |
| Rebalancing signal | `rebalancing-signal` | event-driven (`risk.daily.completed`) | sur événement | n/a | OK |
| Investor memo monthly | `investor-memo-monthly` | `0 9 1 * *` | 1er du mois 09:00 UTC | n/a | OK |
| **MANQUANT** — energy cost | n/a | n/a | n/a | monthly | **P0** |
| **MANQUANT** — T-bills | n/a | n/a | n/a | daily | **P0** |
| **MANQUANT** — RWA yield | n/a | n/a | n/a | daily | **P1** |
| **MANQUANT** — uptime attestation | n/a | n/a | n/a | monthly | **P2** |
| **MANQUANT** — BTC tick 1min | n/a | n/a | n/a | 1 min | **P1** |

---

## Fichiers mock — usage prod vs dev

Trois fichiers dans `src/lib/mock/` :

| Fichier | Consumer prod | Consumer dev/test | Verdict |
|---|---|---|---|
| `src/lib/mock/dashboard.ts` | `src/components/dashboard/mining-health.tsx` (type-only import `MiningHealth`) | — | **OK type-only** — ne fuit pas de données mock en prod |
| `src/lib/mock/proof-center.ts` | `src/lib/data/proofs.ts` (type-only `ProofItem`, `ProofType`), `src/components/proof/*` (types), `src/lib/demo/fixtures.ts` (type) | — | **OK type-only** — le `const PROOFS[]` (28 lignes mockées) n'est jamais importé, juste les types. Mais nom de fichier trompeur : devrait être `proof-center-types.ts`. |
| `src/lib/mock/investor-memo.ts` | — (function `getMockMemoInput()` exportée) | `src/lib/pdf/__tests__/memo-template.test.ts` | **OK** — uniquement consommé par les tests Vitest |

**Conclusion mock** : pas de fuite de données mock vers la prod. Mais le préfixe `mock/` pour des fichiers contenant seulement des types est trompeur — refactor non-bloquant (P2).

---

## Recommandations (priorisées)

1. **(P0)** Créer `src/lib/data/chainlink-btc.ts` lisant `AggregatorV3Interface.latestRoundData()` via viem ; promouvoir CoinGecko en fallback réel. Émettre `provenance: "oracle"` quand on lit Chainlink, `provenance: "live"` quand on lit CoinGecko, `provenance: "stale"` au-delà du seuil.
2. **(P0)** Créer `src/lib/data/energy-cost.ts` + table `EnergyCost` (ou colonne `attestedAt`) + cron mensuel `energy-cost-monthly` consommant un payload signé partenaire (réutiliser `src/lib/attestation/sign.ts`). Remplacer les 4 hardcodes `0.05`.
3. **(P0)** Créer `src/lib/data/t-bills.ts` (Ondo + FRED fallback) ; câbler `RISK_FREE_RATE` + `SORTINO_TARGET` (`advanced-metrics.ts`) sur ce loader. Résoudre les 2 TODO.
4. **(P1)** Ajouter cron `market-data-1min` pour le tick BTC (persist `MiningMetric.btcPrice` ou table `BtcTick` dédiée).
5. **(P1)** Implémenter les fallbacks méthodologiques : `blockchain.info` (difficulty), direct RPC Aave/Compound (stable APY) — vrai deuxième niveau, pas une constante.
6. **(P1)** Persister `fetchDefiLlama` dans une table `MarketSnapshot` (ou pondérer `STABLE_APY_PROXY_PCT` avec `apyMedianPct` live).
7. **(P1)** Décision sur Fear & Greed : soit l'ajouter à méthodologie v1.1 (input sentiment), soit le retirer du cron.
8. **(P1)** Mapper `stale: true` des loaders vers `<ProvenanceBadge kind="stale" />` dans les composants dashboard / portfolio.
9. **(P2)** Pipeline d'ingestion uptime mensuel via `parseAttestationPayload` + Proof + update `MiningMetric.uptimePct`.
10. **(P2)** Renommer `src/lib/mock/proof-center.ts` → `src/lib/types/proof-center.ts` (le contenu mock n'est pas utilisé).
11. **(P2)** Loader `deployedHashrate` (config admin ou attestation partenaire).

---

**Conclusion auditeur** : 10 findings dont **3 P0** bloquants pour la conformité méthodologie v1.0. Les **2 ingestions critiques manquantes ou mockées les plus graves** sont :
- **Chainlink BTC/USD** (annoncé primaire, jamais appelé — CoinGecko sert de primaire au lieu de fallback).
- **Energy cost partner** (100% absent — `0.05` USD/kWh hardcodé dans 4 fichiers, alimente `mining_margin_score` qui pilote risk + rebalancing + APY).

Le code data layer est **propre, défensif, bien instrumenté** (CircuitBreaker, logger, stale flags, fallbacks idempotents) mais **structurellement en dette vis-à-vis de la méthodologie publiée** : 3 sources sur 8 sont absentes, 2 fallbacks promis sont en réalité des constantes.
