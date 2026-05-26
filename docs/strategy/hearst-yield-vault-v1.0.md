---
title: "Hearst Yield Vault — Stratégie complète"
subtitle: "Vault HYV-A · Méthodologie v1.0 · Cayman Exempted LP"
author: "Hearst Connect"
date: "2026-05-26"
---

# Hearst Yield Vault — Stratégie complète

> **Document interne — synthèse du modèle de calcul, des règles de rebalancing et du framework de risque tels qu'implémentés dans le moteur. Chaque numéro de cette synthèse est traçable au code (`src/lib/engine/*`) ou à la méthodologie v1.0 (`docs/methodology/v1.0.md`). Projections conditionnelles aux hypothèses ; performance passée ne préjuge pas du futur ; non garanti.**

---

## 1 · Vault overview

| Paramètre | Valeur |
|---|---|
| **Ticker** | HYV-A |
| **Nom** | Hearst Yield Vault |
| **Statut** | Live (testnet Base Sepolia, mainnet gated par audit Spearbit) |
| **Stratégie** | Mining-backed structured yield, monthly USDC distributions |
| **APY target range** | 9.4 – 12.8 % (bornes resserrées) · 8 – 15 % (enveloppe large sous stress) |
| **Mode par défaut** | Balanced |
| **Share classes** | A (250 k $ / 60 j lock / 2 % mgmt + 10 % perf) · B (1 M $ / 90 j / 0.75 % + 8 %) |
| **Distribution** | Mensuelle, T+5 jours |
| **Méthodologie** | v1.0 (immutable) · v2.0 pour Monte Carlo |
| **SPV** | Cayman Exempted Limited Partnership |

---

## 2 · Structure : 4 sleeves complémentaires

Le vault répartit l'AUM sur **quatre sleeves**, chacun avec un rôle économique distinct. Les pourcentages ci-dessous sont les targets de base ; ils flexent dans des bandes par mode (cf. §7).

| Sleeve | Target (balanced) | Rôle | Source de yield |
|---|---:|---|---|
| **Mining** | **60 %** | Moteur de cashflow USDC mensuel | Revenue-share sur capacité ASIC (BTC mining) |
| **BTC tactical** | **25 %** | Convexité asymétrique sur cycle | Trading P&L (rules-based, jamais discrétionnaire) |
| **USDC base** | **10 %** | Yield défensif liquide | T-bills (Ondo) + lending (Aave/Compound via DefiLlama) |
| **Stable reserve** | **5 %** | Buffer distributions + amortisseur stress | USDC native ~ 4.5 % |

> Source : `src/lib/engine/vaults.ts` — `VAULT_YIELD.allocationTargets`.

L'asymétrie est volontaire : le mining apporte la **prédictibilité du cashflow**, le BTC tactical apporte la **convexité**, le USDC base apporte la **liquidité immédiate** pour les claim windows, le stable reserve apporte le **buffer** quand les guardrails s'arment.

---

## 3 · Sleeve 1 — Mining (60 % de l'AUM)

### 3.1 Formule de revenu par TH/jour

```
gross_revenue   = hashprice_usd_th_day × uptime_assumption (0.98)
energy_cost     = energy_cost_kwh × efficiency_kwh_per_th_day (0.1)
operating_costs = energy_cost + hosting_pool_fees (0.005 $/TH/jour)
net_margin      = gross_revenue − operating_costs
```

> Source : `src/lib/engine/mining.ts:8-23`.

### 3.2 Margin score (0 – 100)

```
raw_score    = 50 + 50 × (net_margin / target_margin − 1)
margin_score = clip(raw_score, 0, 100)
```

Target margin = **0.04 $/TH/jour**. Le margin score conditionne 4 règles de rebalancing (R2, R3, R-BTC-1/2, R-BTC-6) et un guardrail BTC.

### 3.3 De net_margin à APY bucket

```
annualised_usd_per_th = max(0, net_margin) × 365
mining_bucket_apy     = annualised_usd_per_th / 120 $ invested_per_TH
```

> Source : `src/lib/engine/rebalancing.ts:91-99`.

Les **120 $/TH** sont le capex+hosting prepayé que le vault price dans chaque contrat de revenue-share. À hashprice de référence (~ 0.085 $/TH/jour), cela produit ~ 22 % APY bucket → **~ 13 pp APY vault** à 60 % allocation.

### 3.4 Inputs réels (méthodologie v1.0 §"Inputs")

| Variable | Source primaire | Fallback | Cadence |
|---|---|---|---|
| Hashprice | Luxor / Hashrate Index | manual | daily |
| Energy cost | partner contractual + spot index | env override / 0.05 fallback | monthly |
| Uptime | partner monthly attestation (signée) | — | monthly |

> ⚠️ Energy cost vient désormais d'un module canonique (`src/lib/data/energy-cost.ts`) avec env override `MINING_ENERGY_COST_USD_PER_KWH`. La valeur n'est plus hardcodée dans 4 fichiers comme avant l'audit cohérence 2026-05-26.

---

## 4 · Sleeve 2 — BTC tactical (25 % balanced, jamais discrétionnaire)

### 4.1 Cible d'exposition par mode

```
defensive     → 5 %  AUM
balanced      → 12 % AUM
opportunistic → 22 % AUM (cap dur à 30 %)
```

> Source : `src/lib/engine/btc-tactical.ts:34-43`.

### 4.2 Triggers internes (en plus des règles R-BTC §8)

| Trigger | Condition | Action |
|---|---|---|
| accumulate | BTC 30j ≤ −20 % **ET** vol_index < 60 | Multiplicateur 1.1× sur target |
| take_profit | BTC 30j ≥ +40 % | Multiplicateur 0.75× sur target |
| reduce_size | vol_index > 80 | Multiplicateur 0.5× sur target |
| hold | aucun autre armé | Target inchangé |

### 4.3 4 guardrails durs (peuvent overrider un trigger)

| Guardrail | Levels |
|---|---|
| **Volatilité** | normal ≤ 65 · warning 66–80 · **breached** > 80 |
| **Mining margin** | healthy ≥ 70 · warning 50–69 · **breached** < 50 |
| **Concentration** | warning si mode = opportunistic |
| **Liquidité** | placeholder MVP (depth feed onchain en V1) |

> Source : `src/lib/engine/btc-tactical.ts:107-159`.

### 4.4 Contribution APY (bps, dérivée du BTC 30j change)

| BTC 30j change | Contribution bucket |
|---|---:|
| ≥ +30 % | **+1 800 bps** |
| ≥ +10 % | +900 bps |
| entre | +200 bps (base) |
| ≤ −10 % | −200 bps |
| ≤ −25 % | **−600 bps** |

> Source : `src/lib/engine/rebalancing.ts:101-107`.

---

## 5 · Sleeve 3 — USDC base (10 %)

Yield défensif liquide. Composition :

```
usdc_base_bps = stable_apy_pct × 100 + 480 (RWA-like premium) − 200 (mgmt drag)
```

> Source : `src/lib/engine/rebalancing.ts:109-111`.

Sources réelles : **T-bills via Ondo Finance API** (fallback FRED 3M T-bill), **lending APY via DefiLlama** sur Aave + Compound (fallback direct RPC). Cadence daily.

---

## 6 · Sleeve 4 — Stable reserve (5 %)

Buffer liquidité. Yield USDC native ~ 4.5 % (constante engine `STABLE_RESERVE_BPS = 450`). Sert d'**amortisseur** : quand R-BTC-5 (vol > 90) ou R-BTC-6 (margin < 50) s'arment, on bascule le btc_tactical vers ce sleeve.

---

## 7 · Risk framework — 5 dimensions pondérées

> Source : `src/lib/engine/risk.ts:1-48`.

### 7.1 Dimensions et poids

| Dimension | Poids | Formule (0 – 100 ; haut = risqué) |
|---|---:|---|
| **Market** | 30 % | `20 + drawdown × 1.2 + upside × 0.3 + vol_norm × 40` |
| **Mining** | 25 % | `30 + hashprice_pressure(±) + energy_pressure(±)` |
| **Liquidity** | 15 % | `30 + vol_factor + stable_apy_factor` |
| **Smart contract** | 20 % | **80** baseline pré-audit |
| **Counterparty** | 10 % | **35** baseline |

```
composite = Σ weight × dimension_score   (clipped [1, 100])
```

### 7.2 Notes critiques

- Smart contract à **80 / 100 baseline** reflète **l'absence d'audit Spearbit**. Tant que la V1 mainnet n'est pas auditée, le composite reste structurellement élevé. C'est intentionnel — non négociable #8.
- Counterparty à 35 reflète le risque partner (mining operator, custody) — réévalué quand le mining contract est rotaté.
- Sharpe / Sortino / VaR sont calculés (`risk.ts:111-144`) mais **réservés à l'Advanced mode** (méthodologie v1.0 §"Forbidden in any projection output").

---

## 8 · Mode detection — bascule defensive ↔ balanced ↔ opportunistic

> Source : `src/lib/engine/rebalancing.ts:37-54`.

```
risk ≥ 65 OU margin < 50    → defensive
risk ≤ 40 ET margin ≥ 75    → opportunistic
sinon                         → balanced
```

Allocation par mode :

| Mode | mining | btc_tactical | usdc_base | stable_reserve |
|---|---:|---:|---:|---:|
| **defensive** | 25 % | 5 % | **55 %** | 15 % |
| **balanced** | 35 % | 15 % | 40 % | 10 % |
| **opportunistic** | 35 % | 25 % | 30 % | 10 % |

Note : les targets baseline en allocation **balanced** (35/15/40/10) sont plus prudentes que les targets affichés au LP (60/25/10/5). Le mode "balanced rebalanced" est intermédiaire — le 60/25/10/5 est l'objectif *quand* margin et BTC momentum sont positifs.

---

## 9 · Rebalancing rules — 12 règles en format PTAI

Chaque règle produit un signal **Projection → Trigger → Action → Impact**. Aucune sortie ne contient les mots interdits (`guarantee`, `promise`, `certain`, `will deliver`, `risk-free`, `no risk`) — vérifié par `assertNoForbiddenWords` à l'émission.

> Source : `src/lib/engine/rebalancing-rules.ts:231-499`.

| ID | Trigger | Action |
|---|---|---|
| **R1** | BTC 30j ≤ −25 % AND mode ≠ defensive | Switch en defensive (mining 25 %, stable 70 %) |
| **R2** | margin_score < 50 | −30 % mining, +Δ stable_reserve |
| **R3** | margin > 75 AND BTC > 0 % | +10 pp mining (depuis usdc_base), cap 45 % |
| **R4** | hashprice trend ≤ −20 % | **Multisig review 72 h** (zéro reweight auto) |
| **R5** | stable_apy > mining_apy + 1 pp | Rotation mining → usdc_base (max 10 pp) |
| **R-BTC-1** | BTC −20 % + margin ≥ 60 + pos < 20 % | +5 pp btc_tactical ← usdc_base |
| **R-BTC-2** | BTC −35 % + margin ≥ 60 + pos < 25 % | +5 pp incrémental btc_tactical |
| **R-BTC-3** | BTC +30 % + pos > 10 % | Sell 25 % du BTC → stable_reserve |
| **R-BTC-4** | BTC +60 % + pos > 10 % | Sell 25 % incrémental |
| **R-BTC-5** | vol_index > 90 | Halve BTC sleeve → stable_reserve |
| **R-BTC-6** | margin < 50 (et R2 pas armé) | Suspend BTC accumulation |

### 9.1 Hiérarchie

R1 (régime defensive) prime. Les R-BTC ne peuvent pas armer si le mining est en stress (R-BTC-6 désactive R-BTC-1/2). R4 est **purement informatif** — déclenche une revue humaine, jamais un reweight automatique.

### 9.2 Exécution

- Les signaux émis sont **proposés** par l'engine, **pas exécutés**.
- L'exécution passe par **multisig 3/5 signers + timelock 48 h** (sauf actions intra-bandes en mode normal).
- Chaque exécution émet un `RebalanceEvent` Prisma + un log onchain (`EventLogger.sol`).

---

## 10 · APY composition — la math finale

> Source : `src/lib/engine/rebalancing.ts:56-89` + méthodologie v1.0 §"Yield projection".

```
yield_contribution_bps[bucket] = base_allocation[bucket] / 100 × bucket_apy_bps[bucket]
vault_apy_bps                  = Σ yield_contribution_bps
```

**Exemple balanced base** (mining 35 %, btc 15 %, usdc 40 %, stable 10 %) :

| Sleeve | Allocation | Bucket APY | Contribution |
|---|---:|---:|---:|
| Mining | 35 % | ~ 22 % | **+7.7 pp** |
| BTC tactical | 15 % | +200 bps (base) | +0.3 pp |
| USDC base | 40 % | ~ 4.5 % (T-bills + lending) | +1.8 pp |
| Stable reserve | 10 % | 4.5 % | +0.45 pp |
| **Total mid-range** | | | **≈ 10.3 %** |

Après application du facteur d'incertitude méthodologique (±10 – 30 % selon timeframe et fraîcheur data), le range publié devient **9.4 – 12.8 %**.

```
apy_low  = projected_apy × (1 − assumption_risk_factor)
apy_high = projected_apy × (1 + assumption_upside_factor)
```

**Stressed APY** (méthodologie v1.0 §"Stressed APY") : scénario combiné BTC −40 % + Hashprice −30 % + Mining margin compression → typiquement bande **5 – 7 %**.

---

## 11 · Cadence opérationnelle

| Quoi | Cadence | Mécanisme |
|---|---|---|
| BTC price ingestion | 1 min | Chainlink BTC/USD primaire (viem) · CoinGecko fallback |
| Hashprice ingestion | daily | Luxor / Hashrate Index API |
| Margin score recompute | hourly | Inngest `market-data-hourly` |
| Rebalancing signal eval | event-driven + hourly | Inngest `rebalancing-signal` |
| Risk score daily | daily | Inngest `risk-daily` |
| Multisig review (R4) | sous 72 h | 3/5 signers, timelock 48 h |
| Distribution LP | mensuelle, T+5 j | Epoch close + claim window |
| Mining attestation | mensuelle | Signée par partner (allowlist signer requise) |
| Investor memo | mensuelle | Inngest `investor-memo-monthly` |

---

## 12 · Cross-product mechanics — comment les sleeves se parlent

Les 4 sleeves ne sont pas indépendants. Les règles **relient explicitement** des paires :

```
Mining ↔ Stable reserve     :  R2  (margin compress → mining ↓, stable ↑)
Mining ↔ USDC base          :  R3  (margin healthy + BTC+ → mining ↑ depuis usdc_base)
                               R5  (RWA premium → rotation mining → usdc_base)
USDC base ↔ BTC tactical    :  R-BTC-1, R-BTC-2  (drawdown → +BTC depuis usdc_base)
BTC tactical ↔ Stable       :  R-BTC-3, R-BTC-4  (rally → take profit → stable)
                               R-BTC-5         (vol breach → halve BTC → stable)
USDC base ↔ Stable          :  R-BTC-6         (mining stress + BTC accum suspendue)
```

Chaque rebalancing est **conservatif sur la somme** : ce qu'on retire d'un sleeve, on l'ajoute à un autre dans la même PTAI signal.

---

## 13 · Governance & guardrails

### 13.1 Multisig

- 3/5 signers requis pour exécuter un signal de rebalancing.
- Timelock 48 h entre `schedule()` et `execute()`.
- Cancel-quorum **2/5** (asymétrie volontaire — "defense favors halting").
- Pre-execution Tenderly fork simulation panel (diff state + gas + reverts).

### 13.2 Attestations

- Mining monthly attestation signée par partner.
- Signer allowlist obligatoire (env `ATTESTATION_ALLOWED_SIGNERS`).
- Fail-closed en prod : pas d'allowlist configurée = attestation rejetée.
- 3 checks ordonnés : signature ECDSA → signer ∈ allowlist → digest match payload.

### 13.3 Forbidden words

- 6 mots interdits dans toute sortie : `guarantee`, `promise`, `certain`, `will deliver`, `risk-free`, `no risk`.
- Module canonique `src/lib/agents/forbidden-words.ts` partagé entre 5 lieux (agents, notifications, wizard inline, vault actions Zod refine, engine).
- Inflections matchées (`guaranteed`, `guarantees`, `guaranteeing`).
- Négation 3-mots autorisée (`not guaranteed`, `never promise`).

### 13.4 Provenance

- Chaque métrique exposée au LP porte un badge : `Live · Oracle · Attested · Estimated · Manual · Stale`.
- Threshold de fraîcheur centralisé dans `src/lib/data/freshness.ts` (`STALE_THRESHOLDS` registry).

---

## 14 · Risque résiduel & ce qui n'est pas encore live

| Item | Statut | Impact |
|---|---|---|
| Audit Spearbit final | En cours | Mainnet bloqué jusqu'à remediation. SC risk dimension reste à 80 baseline. |
| Per-vault VaultSnapshot | Phase 3 | AUM non-Yield reste à 0 (Defensive, BTC Plus). |
| Position.shareClass Prisma | TODO | Fees class A vs B pas différenciés au runtime (fallback A). |
| Monte Carlo paths à 10 000 | v2.0 | UI tourne sur 1 000 actuellement. |
| Tests intégration 12 règles vs 36 m historique | À ajouter | Couverture engine actuelle = unit + snapshot. |
| Méthodologie v2.1 (multi-vault + share classes) | DRAFT | Promotion conditionnelle Product + Risk sign-off + ADR-010. |

---

## 15 · Glossaire

| Terme | Définition |
|---|---|
| **AUM** | Assets Under Management (capital investi dans le vault, en USDC) |
| **Hashprice** | Revenu attendu par TH/s/jour de hashrate ($/TH/jour) |
| **Margin score** | Indicateur 0–100 de la rentabilité mining nette vs target |
| **PTAI** | Projection → Trigger → Action → Impact (format obligatoire pour rebalancing) |
| **Vol index** | Indice de volatilité réalisée BTC (proxy 30j) |
| **Sleeve** | Bucket d'allocation (mining / btc_tactical / usdc_base / stable_reserve) |
| **Mode** | Régime de risque du vault (defensive / balanced / opportunistic) |
| **Soft lock-up** | Période minimale avant retrait sans pénalité (60 j class A, 90 j class B) |
| **Provenance badge** | Marqueur de la source d'une métrique (Live, Oracle, Attested, Estimated, Manual, Stale) |
| **Multisig 3/5** | 3 signatures requises sur 5 signers pour exécuter une transaction |
| **Timelock 48 h** | Délai imposé entre planification et exécution d'une transaction onchain |

---

## 16 · Références code

| Domaine | Fichier |
|---|---|
| Vault definition | `src/lib/engine/vaults.ts` |
| Mining model | `src/lib/engine/mining.ts` |
| BTC tactical | `src/lib/engine/btc-tactical.ts` |
| Rebalancing math | `src/lib/engine/rebalancing.ts` |
| Rebalancing rules (R1–R5, R-BTC-1..6) | `src/lib/engine/rebalancing-rules.ts` |
| Risk framework | `src/lib/engine/risk.ts` |
| Scenario orchestrator | `src/lib/engine/scenario.ts` |
| Backtest engine | `src/lib/engine/backtest.ts` |
| Monte Carlo (v2.0) | `src/lib/engine/monte-carlo.ts` |
| Methodology (canonique) | `docs/methodology/v1.0.md` |
| Methodology MC extension | `docs/methodology/v2.0.md` |
| Forbidden words enforcer | `src/lib/agents/forbidden-words.ts` |
| Freshness registry | `src/lib/data/freshness.ts` |
| Attestation verifier | `src/lib/attestation/stored.ts` |

---

**Disclaimer.** Les projections décrites dans ce document sont conditionnelles aux hypothèses énoncées en méthodologie v1.0. La performance passée ne préjuge pas du futur. Hearst Yield Vault est offert exclusivement aux investisseurs professionnels / qualifiés via un Cayman Exempted Limited Partnership, sous réserve d'une souscription minimale, d'une période de lock-up et de restrictions juridictionnelles. Ce document n'est ni une offre ni une sollicitation là où interdites.
