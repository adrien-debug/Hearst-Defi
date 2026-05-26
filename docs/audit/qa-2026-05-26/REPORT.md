# QA Manuel — Hearst Connect — 2026-05-26

**Méthode :** sweep Playwright (port 4105, dev server), login admin (`pierre@hearstcorporation.io`), navigation systématique sur 20 routes (5 produit + 15 admin/flows), screenshots full-page, capture console errors/warnings.

**Périmètre testé :**
- Produit : `/`, `/portfolio`, `/vaults`, `/proof-center`, `/profile` (5 pages)
- Admin : `dashboard`, `vaults`, `customers`, `distributions`, `governance`, `monitoring`, `scenario-lab`, `signals`, `investor-memo`, `projection`, `proof-center`, `proofs`, `roadmap`, `feedback`, `spec` (15 pages)
- Flows critiques : wizard `/admin/vaults/new` (step 1/7), `/admin/governance/propose`, `/admin/governance/allowlist`, `/admin/governance/simulate-demo` (4 flows)

**Total findings :** **3 P0** · **9 P1** · **4 P2** · **0 erreur console (only 2 warnings RPC fallback)**

---

## 1 · Findings P0 (bloquants — fausse data côté LP-facing)

### P0-1 — `/portfolio` NAV/share affiche `1.0000 USDC` alors qu'aucune position n'existe

[src/app/(product)/portfolio/page.tsx:151-152](src/app/(product)/portfolio/page.tsx#L151-L152)

```ts
const shares = totalPrincipal > 0 ? totalPrincipal : 1;
const navPerShare = totalValueUsdc > 0 ? totalValueUsdc / shares : 1;
```

Fallback `1` → un LP non-investisseur voit "NAV / share 1.0000 USDC · class A" avec badge `Stale`. Le badge ne sauve pas — c'est exactement la classe de "faux chiffre" interdite (CLAUDE.md non-négociable §2 + directive utilisateur 2026-05-26).

**Fix :** afficher `—` quand `totalPrincipal === 0`.

---

### P0-2 — `/portfolio` Lock·Liquidity affiche `NaN%`

Snapshot DOM ([qa-portfolio.snap.md ligne 117-118](docs/audit/coherence-2026-05-26/05-provenance-badges.md)) :
```
progressbar "Lockup progress: NaN% — fully unlocked"
generic [ref=e147]: NaN%
```

Division par zéro dans `LockMeter` quand `softLockupDays === 0` (cas du loader patché à 0 lors de l'audit cohérence pour ne pas inventer 60d). Badge "Live".

**Fix :** dans `components/portfolio/lock-meter.tsx`, guard `softLockupDays <= 0` → afficher "no lock-up" / `0%`.

---

### P0-3 — `/admin/dashboard` titre "APY Range · trailing 30D · target **12%**" = point unique

Capture : [qa-02-admin-dashboard.png](docs/audit/qa-2026-05-26/screenshots/qa-02-admin-dashboard.png) — sous-titre du chart "APY Range" affiche `TARGET 12%` (point unique) alors que la règle non-négociable #1 impose toujours un range. Le chart lui-même est vide ("No historical data yet"), mais le label "target 12%" est figé en string.

**Fix :** dans `src/components/admin/timeseries-section.tsx` ou équivalent, remplacer `target 12%` par `target 9.4–12.8%` via `<ApyRange>` ou helper `formatApyRange`.

---

## 2 · Findings P1 (anomalies de provenance / UX)

### P1-1 — `/portfolio` Composite Risk = `0/100 Low`

Le label "Low" est affiché alors que tous les sous-scores sont à 0 (aucune snapshot DB). Sémantiquement faux : "Low risk" sur "no data" suggère un signal positif inexistant.

**Fix :** dans `risk-pulse.tsx`, si toutes les dimensions sont `0`, afficher `—` au lieu de "Low".

### P1-2 — `/portfolio` Proof Pulse "✓ matches" sur deux zéros

PoR : `Vault TVL $0.0 · On-chain $0.0 · Delta 0.00%` avec checkmark vert "matches". Faux signal positif sur "no data".

**Fix :** quand `statedTvlUsdc === 0 && onChainTvlUsdc === 0`, afficher état "no attestation yet" sans checkmark.

### P1-3 — `/portfolio` Time-to-cash badges `Live · Estimated` sur APY range `0.0–0.0%`

Affiche "Projected from current pool yield 0.0–0.0% APR" badgé `Live · Estimated`. Si APY est à 0, le badge ne devrait pas dire "Live".

**Fix :** si `apyLow + apyHigh === 0`, ProvenanceBadge passe en `stale`.

### P1-4 — `/proof-center` (et `/admin/proof-center`) eth_getLogs Alchemy free-tier fail

Console warning : `chain/por-registry.ts` et `chain/event-logger.ts` appellent `eth_getLogs` avec `fromBlock: "earliest", toBlock: "latest"` → Alchemy free-tier limit 10 blocks → **calls échouent en silence**. Conséquence : aucune attestation onchain ne peut s'afficher en dev. Tombe en fallback "no on-chain events yet".

**Fix :** dans `src/lib/chain/por-registry.ts` + `event-logger.ts`, calculer un `fromBlock` réaliste (par ex. `latestBlock - 9` ou block de déploiement depuis env `NEXT_PUBLIC_EVENT_LOGGER_DEPLOY_BLOCK`).

### P1-5 — `/admin/customers` "Investors (3)" mais 2 rows affichées

Header dit "Investors (3)" et footer "Showing 1-3 of 3" mais seulement `test@hearst.local` (APPROVED) et `dev@hearst.local` (PENDING) sont visibles. La 3e row manque — possible filtre invisible ou bug pagination.

**Fix :** vérifier la query Prisma `findMany` vs `count` dans `admin/customers/page.tsx`. Probable mismatch entre la query qui exclut l'admin et le count qui ne l'exclut pas.

### P1-6 — `/admin/dashboard` vault selector duplique "Hearst Yield Vault"

Top selector affiche : `Hearst Yield Vault · Hearst Defensive Vault · Hearst BTC Plus Vault · Hearst Yield Vault` — le Yield Vault apparaît 2× (visible aussi sur `/admin/proof-center`).

**Fix :** dans `listAllVaults` (vault resolver), dedupliquer par `id` avant retour.

### P1-7 — `/admin/proof-center` ProofOfReserves "Connected · Base Sepolia · no on-chain events yet"

Affiche "ATTESTED" sur USDC Reserves $0.00 avec timestamp "May 26, 2026 at 6:10 PM" alors que aucun event onchain n'a remonté. Le badge "ATTESTED" est trompeur si la valeur est `$0.00`.

**Fix :** si `usdcReserves === 0`, badge devient `stale` ou `pending`.

### P1-8 — `/admin/scenario-lab` cards "Yield · Defensive · BTC Plus" cliquables même si DB vide

Les tabs vault sont actifs côté UI mais derrière, seul Yield a des données engine valides (les 2 autres ont AUM 0 et pas de snapshot). Le clic sur Defensive/BTC Plus va probablement produire des résultats engine corrects (basés sur les presets) mais sans signal "draft only".

**Fix :** ajouter un badge `Preset only · not live` sur Defensive et BTC Plus tant que pas de snapshot.

### P1-9 — `/admin/wizard/vaults/new` "Resume vault draft — step 1/7 · Autosaved 9 min ago"

Affichage OK mais cliquer sur "Resume" charge un draft d'il y a 9 minutes avec `Hearst Yield Vault — Series A` et ticker `HYV-A` déjà rempli. Un admin tentant de créer un nouveau vault va éditer ce draft par accident. La pastille "Discard" existe à droite mais n'est pas évidente.

**Fix :** afficher un état initial "Start from scratch" vs "Resume draft" plus visible.

---

## 3 · Findings P2 (cosmétique / minor)

### P2-1 — Chat Kimi (rail droit) bloqué sur message d'accueil

Le textarea `Message à Kimi…` est présent, bouton Envoyer disabled tant qu'aucun texte. Toggle Conversation/Review fonctionne. Mais pas de test réel d'envoi car aurait consommé crédits LLM. **Marqué pour test ultérieur** avec API key dev.

### P2-2 — Tabs admin sub-nav non highlighted sur `/admin/customers`

Visible sur la capture : `Customers · Feedback` sont les tabs visibles, mais le highlight visuel sur l'onglet actif est faible.

### P2-3 — Cards portfolio empty state "No yield source data yet — awaiting first vault snapshot"

OK fonctionnellement mais le wording mélange anglais et français selon les widgets (note "awaiting first vault snapshot" en EN, autres notes en FR). Cohérence linguistique à fixer.

### P2-4 — Footer chat rail droit affiche un bouton "Générer le document" toujours visible

Même quand la conversation est vide. Possiblement attendu mais peu utile sur un onboarding froid.

---

## 4 · Pages PASS (sans anomalie majeure)

| Page | Statut | Notes |
|---|---|---|
| `/` (login) | ✅ | Form simple, redirige vers `/portfolio` après login |
| `/profile` | ✅ | Info admin propre, Investment summary à 0 (Live, cohérent) |
| `/vaults` (LP) | ✅ | "No products available" propre (filtres placeholders) |
| `/admin/vaults` | ✅ | 6 vaults listés (HYV-A LIVE, HBP-A REVIEW, HDV-A REVIEW + 3 placeholders DRAFT) |
| `/admin/distributions` | ✅ | Form "Compute next distribution" + "No distributions yet" propre |
| `/admin/governance` | ✅ | "No proposals found · Create the first one" propre, 4 tabs (All/Awaiting my sig/Timelock/Executable) |
| `/admin/governance/propose` | ✅ | Form complet : Vault, Action type, Calldata JSON, Justification (≥80 chars) |
| `/admin/governance/allowlist` | ✅ | Form add + table vide, doc Anchorage quorum routing visible |
| `/admin/governance/simulate-demo` | ✅ | 3 actions mock (setFeeRecipient, updateAllocation, deliberateRevert), bouton Simulate |
| `/admin/monitoring` | ✅ | Telemetry LLM réelle : 2171 runs, 78% success, $4.35 total cost |
| `/admin/scenario-lab` | ✅ | Sliders + presets fonctionnels (Base, BTC Bear, BTC Bull, Mining Compression, Extreme Stress) |
| `/admin/signals` | ✅ | 5 tabs status + "No rebalance signals with status pending" propre |
| `/admin/investor-memo` | ✅ | Bouton "Generate memo" + "Download PDF" présents, "Not yet generated" |
| `/admin/projection` | ✅ | Projection Studio avec 5 presets + 5 sliders + zone résultat |
| `/admin/proofs` | ✅ | "No proofs yet · Use the ingest CLI" propre, 0 attestations |
| `/admin/roadmap` | ✅ | MVP progress 48/48 (100%), accordéons par semaine, statut tracked |
| `/admin/feedback` | ✅ | Form post + "No feedback yet. Be the first." propre |
| `/admin/spec/*` | ✅ | MDX renderer fonctionnel sur 00-vision et autres |
| `/admin/proof-center` | ⚠️ | Vault selector duplique HYV (P1-6), badges Attested sur $0 (P1-7) |
| `/admin/dashboard` | ⚠️ | "Target 12%" point unique (P0-3), vault selector dupliqué (P1-6) |

---

## 5 · Console errors / warnings

| Page | Severity | Message |
|---|---|---|
| `/proof-center` | warning | `chain/por-registry` `eth_getLogs` Alchemy free-tier limit (cf. P1-4) |
| `/proof-center` | warning | `chain/event-logger` `eth_getLogs` Alchemy free-tier limit (cf. P1-4) |
| `/admin/proof-center` | warning | Idem (mêmes 2 warnings) |
| Toutes autres pages | — | **0 erreur, 0 warning** |

---

## 6 · Verdict global

**Le wipe `prisma/dev.db` + suppression du demo system + neutralisation des chiffres inventés ont fonctionné** : les pages LP-facing montrent désormais des vrais empty states ("No positions", "No yield source data yet", "No distributions", "No proofs") avec badges `Stale` au lieu de fixtures masquées en "Live".

**3 P0 restants** sont des **fallbacks oubliés** dans 3 fichiers UI précis (`portfolio/page.tsx`, `lock-meter.tsx`, `timeseries-section.tsx` ou label cousin). Tous corrigeables en <30 min.

**Conformité non-négociables CLAUDE.md** :
- §1 APY range : 1 violation restante (P0-3 "target 12%")
- §2 Provenance badge : OK partout, 3 cas d'incohérence sémantique (P1-1/2/3)
- §5 Forbidden words : aucun mot interdit détecté dans l'UI
- §10 Disclaimer "not guaranteed" : présent sur Yield Stack, Time-to-cash, Projection, footer Vaults

---

## 7 · Suite recommandée

| Priorité | Action | Effort |
|---|---|---|
| P0 | Fixer NAV/share fallback `1.0000` (portfolio/page.tsx:151-152) | 5 min |
| P0 | Fixer Lock·Liquidity `NaN%` (lock-meter.tsx, guard 0 days) | 10 min |
| P0 | Fixer "target 12%" → range `9.4–12.8%` (admin dashboard timeseries) | 10 min |
| P1 | Fixer Composite Risk label "Low" sur no-data → "—" | 5 min |
| P1 | Fixer PoR "✓ matches" sur deux zéros → "no attestation yet" | 5 min |
| P1 | Fixer Time-to-cash badges `Live` sur 0 APY → `stale` | 5 min |
| P1 | Fixer eth_getLogs `fromBlock: "earliest"` → block range fini | 20 min |
| P1 | Fixer `/admin/customers` count mismatch (3 vs 2 rows) | 15 min |
| P1 | Fixer vault selector dedup `Hearst Yield Vault` 2× | 5 min |
| P1 | Badge "Preset only · not live" sur Defensive / BTC Plus tant que pas live | 10 min |
| P2 | Cohérence linguistique EN/FR sur empty states | 30 min |
| P2 | Highlight visuel tab admin actif | 15 min |

**Total dette identifiée : 2h30 pour purger les 12 anomalies P0/P1.**

---

## 8 · Screenshots

Tous dans [docs/audit/qa-2026-05-26/screenshots/](docs/audit/qa-2026-05-26/screenshots/) :

| # | Page | Fichier |
|---|---|---|
| 01 | `/portfolio` (LP) | `qa-01-portfolio.png` |
| 02 | `/admin/dashboard` | `qa-02-admin-dashboard.png` |
| 03 | `/admin/vaults` | `qa-03-admin-vaults.png` |
| 04 | `/admin/customers` | `qa-04-admin-customers.png` |
| 05 | `/admin/distributions` | `qa-05-admin-distributions.png` |
| 06 | `/admin/governance` | `qa-06-admin-governance.png` |
| 07 | `/admin/monitoring` | `qa-07-admin-monitoring.png` |
| 08 | `/admin/scenario-lab` | `qa-08-admin-scenario-lab.png` |
| 09 | `/admin/signals` | `qa-09-admin-signals.png` |
| 10 | `/admin/investor-memo` | `qa-10-admin-investor-memo.png` |
| 11 | `/admin/projection` | `qa-11-admin-projection.png` |
| 12 | `/admin/proof-center` | `qa-12-admin-proof-center.png` |
| 13 | `/admin/proofs` | `qa-13-admin-proofs.png` |
| 14 | `/admin/roadmap` | `qa-14-admin-roadmap.png` |
| 15 | `/admin/feedback` | `qa-15-admin-feedback.png` |
| 16 | `/admin/spec` | `qa-16-admin-spec.png` |
| 17 | `/admin/vaults/new` (wizard) | `qa-17-admin-vaults-new.png` |
| 18 | `/admin/governance/propose` | `qa-18-admin-propose.png` |
| 19 | `/admin/governance/allowlist` | `qa-19-admin-allowlist.png` |
| 20 | `/admin/governance/simulate-demo` | `qa-20-admin-simulate-demo.png` |

---

**Build status pendant le QA :**
```
pnpm typecheck   ✅ 0 erreurs
pnpm lint        ✅ 0 erreurs
pnpm test --run  ✅ 127/127 fichiers · 1758/1758 tests
```

Aucune régression de build introduite pendant le sweep.
