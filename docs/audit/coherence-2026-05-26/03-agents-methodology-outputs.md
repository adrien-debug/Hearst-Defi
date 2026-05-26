# Audit 03 — Cohérence Agents ↔ Méthodologie ↔ Outputs

**Date** : 2026-05-26
**Périmètre** : `src/lib/agents/*`, `src/lib/pdf/*`, loaders, `src/app/admin/*/actions.ts`, `src/lib/engine/monte-carlo.ts`
**Mode** : read-only
**Ref CLAUDE.md** : §4 structured outputs · §5 forbidden words · §10 assumptions + "not guaranteed" · ADR-006 (MC v2.0) · ADR-007 (Kimi K2.6 only)

---

## Résumé exécutif

Les 4 agents (`scenario-narrative`, `mining-health`, `risk-explanation`, `investor-memo`) tournent tous sur `kimi-k2.6`, retournent du JSON Zod-strict (`.strict()`) et invoquent `assertNoForbiddenWords` + `assertCitesAssumption` sur **tous les champs textuels de sortie**. La discipline est globalement saine : aucun chat libre, aucun champ texte n'échappe au linter, les disclaimers ne sont jamais générés par le modèle (`DISCLAIMER_NOT_GUARANTEED` + `DISCLAIMER_PROJECTION` injectés littéralement dans le system prompt et exigés verbatim dans `disclaimer`).

**Mais** le contrat méthodo est figé en v1.0 dans **tous** les agents (`METHODOLOGY_VERSION = "v1.0"` dans `system-prompts/methodology.ts`), alors que la v2.0 (Monte Carlo, ADR-006) est livrée et exposée côté UI (`MonteCarloReview`, `runMonteCarloAction`). Aucun agent n'a de chemin pour citer v2.0. Si demain un narratif est généré à partir d'un `MonteCarloOutput`, il citera v1.0 alors que le calcul est v2.0 → **P0 méthodo drift latent**.

Second risque structurel (P0) : `loadMemoInput()` reconstruit le `vault` en mélangeant la **live snapshot** (AUM, mode, riskScore depuis la dernière `VaultSnapshot` — donc le Yield Vault par construction de la timeline) avec le **preset demandé** (apyRange, name, assumptions depuis `VAULTS[id]`). Pour un vault ≠ yield (defensive, btc-plus), le memo affiche les hypothèses du preset choisi mais les KPIs (AUM, mode opérationnel, riskScore) du Yield Vault. Le commentaire dans le code (`loaders/vault.ts:90-93`) avoue le hack explicitement et flag Phase 3.

Troisième écart structurel (P1) : la **PDF route** `src/app/api/statements/[id]/pdf/route.tsx` (statement LP) écrit `"Projections — not guaranteed. APY ranges (9.4-12.8%) are target"` directement dans le PDF, sans jamais passer par `assertNoForbiddenWords`. Le memo PDF (`src/lib/pdf/memo-pages/disclaimer.tsx`) contient aussi un `FALLBACK_DISCLAIMER` hardcodé qui n'est pas testé par le linter. Aucun de ces textes ne contient à ce jour de forbidden word, mais le contournement existe.

---

## Tableau agent × (schema · forbidden-words · disclaimer · méthodo version)

| Agent | Schéma Zod (sortie) | Forbidden-words validator | Cite-assumption validator | Disclaimer injecté | Méthodo citée |
|---|---|---|---|---|---|
| **scenario-narrative** | `ScenarioNarrativeOutputSchema` (`.strict()`) → `narrative_md`, `risk_warning`, `confidence`, `key_drivers[1..5]` | Output : `narrative_md`, `risk_warning`. Entrée : non (assumptions engine déjà filtrées par `src/lib/engine/scenario.ts` linter dupliqué) | `narrative_md` | `DISCLAIMER_NOT_GUARANTEED` + `DISCLAIMER_PROJECTION` injectés en system prompt, **non exigés dans la sortie** (pas de champ `disclaimer`) | `v1.0` (hardcodé en system prompt via `METHODOLOGY_VERSION`) |
| **mining-health** | `MiningHealthOutputSchema` (`.strict()`) → `alert_level`, `summary`, `recommendation` | Output : `summary`, `recommendation`. Entrée : N/A (input = numbers) | `summary` uniquement | Injecté en system prompt, **non exigé dans la sortie** | `v1.0` |
| **risk-explanation** | `RiskExplanationOutputSchema` (`.strict()`) → `top_risks[1..2]{risk_id, name, explanation, suggested_guardrail}`, `overall_summary` | Output : `top_risks[].explanation`, `top_risks[].suggested_guardrail`, `overall_summary`. Entrée : N/A (numbers) | `top_risks[].explanation` + `overall_summary` | Injecté en system prompt, **non exigé dans la sortie** | `v1.0` |
| **investor-memo** | `InvestorMemoOutputSchema` (`.strict()`) → 8 sections Markdown (`executive_summary`, `vault_structure`, `scenario_analysis`, `risk_section`, `mining_section`, `performance_section`, `methodology_note`, `disclaimer`) | Output : **les 8 sections** (y compris `disclaimer`). Entrée : `vault.assumptions` non re-vérifié (déjà sanitisé côté `vaults.ts` source) | Les 7 sections de prose (`disclaimer` exempté car template légal verbatim, cf. commentaire ligne 296-299) | Injecté **et** exigé verbatim dans `disclaimer` (linter check OK car `not guaranteed` est exempté par règle de négation) | `v1.0` |

**Validators partagés** : `src/lib/agents/validators.ts` (source unique) + duplication tolérée dans `src/lib/engine/scenario.ts`, `backtest.ts`, `btc-tactical.ts`, `rebalancing-rules.ts` (commentaires `// keep in sync` présents — dette technique reconnue). `src/lib/hooks/use-forbidden-words.ts` redéfinit la liste pour le client.

---

## Findings

### P0 — Méthodo drift latent : MC v2.0 jamais cité

**Fichiers concernés** : `src/lib/agents/system-prompts/methodology.ts:22` · `src/components/admin/monte-carlo-review.tsx` · `src/app/admin/scenario-lab/actions.ts:273-330` · `src/lib/engine/monte-carlo.ts`

- `METHODOLOGY_VERSION` est une constante littérale `"v1.0"`. Les 4 agents l'inlinent dans leur system prompt.
- `runMonteCarloAction` produit un `MonteCarloOutput` (p5/p50/p95 + `probBelowFloor`) qui contient les paramètres MC (seed, paths, btc drift/vol, difficulté…). Méthodologie v2.0 par construction (ADR-006).
- **Aujourd'hui** : aucun agent ne consomme `MonteCarloOutput`. Pas de violation immédiate.
- **Demain (P0 latent)** : si un narratif est ajouté autour des p5/p50/p95 (boutons "Explain this MC run", "Narrate Monte Carlo" déjà évoqués dans le memo `methodology v2.0-draft`), `runScenarioNarrative` les enverra à Kimi avec un system prompt qui **affirme `v1.0`** — un LP lira "computed per Methodology v1.0" sur une projection probabiliste v2.0.
- `src/components/admin/monte-carlo-review.tsx:165` mentionne `Methodology v2.0-draft` dans un tooltip UI ; `src/lib/pdf/memo-pages/disclaimer.tsx:29` hardcode `"Outputs follow Hearst methodology v1.0"` en fallback. Les deux mondes coexistent sans contrat.

**Recommandation** : passer `METHODOLOGY_VERSION` en paramètre injecté par l'appelant (engine output → agent), pas en constante. `ScenarioOutput.assumptions` contient déjà `"methodology_version=v1.0"` ; `MonteCarloOutput` doit faire pareil avec `v2.0`. L'agent prend la version depuis l'input, jamais depuis une constante.

### P0 — `loadMemoInput()` mixe live (yield) + preset (vault demandé)

**Fichiers concernés** : `src/lib/agents/loaders/vault.ts:68-113`

```ts
// loaders/vault.ts:94-103
const liveVault = projectVault(toVaultSnapshotRow(snapshot));
const vault: MemoLoadResult["vault"] = {
  id: def.id,                          // ← du preset demandé
  name: def.label,                     // ← du preset
  aumUsdc: liveVault.aumUsdc,          // ← de la dernière VaultSnapshot (= yield)
  apyRange: { low: def.apyTarget.low, high: def.apyTarget.high }, // ← preset
  mode: liveVault.mode,                // ← snapshot (= yield)
  riskScore: liveVault.riskScore,      // ← snapshot (= yield)
  assumptions: [...def.assumptions],   // ← preset
};
```

Si on génère un memo pour `defensive` (apyRange 5–8%, baseMode defensive) :
- Le memo dira `apyRange: 5-8%` (preset) mais `mode: balanced` (snapshot Yield).
- `aumUsdc` et `riskScore` seront ceux du Yield Vault. Le LP du Defensive Vault lit un mémo avec **l'AUM et le risque d'un autre vault**.

Le commentaire ligne 90-93 reconnaît le hack (`Phase 3 schema migration`). Pour un vault unique en MVP (`yield` only) la sortie est correcte. Dès qu'un deuxième vault est servi, ADR-006 #9 est violé en production.

**Recommandation** : tant que `VaultSnapshot` n'a pas de `vaultDeploymentId`, refuser explicitement `vaultId !== "yield"` dans `loadMemoInput` (throw clair), au lieu d'assembler silencieusement un mémo hybride. Ou ajouter la colonne et filtrer.

### P1 — PDF (statement + memo fallback) ne repasse PAS par le linter

**Fichiers concernés** : `src/app/api/statements/[id]/pdf/route.tsx:528-529` · `src/lib/pdf/memo-pages/disclaimer.tsx:11-12, 29`

- `route.tsx:528` : `"Projections — not guaranteed. APY ranges (9.4-12.8%) are target ..."` écrit en dur dans le PDF du statement LP. Aucun appel à `assertNoForbiddenWords`.
- `memo-pages/disclaimer.tsx:11` : `FALLBACK_DISCLAIMER` hardcodé (utilisé quand `data.memo` est `null`, c.-à-d. preview / dev). Pas linté.
- `memo-pages/disclaimer.tsx:29` : fallback `methodologyBody` = `"Outputs follow Hearst methodology v1.0..."` — pas linté.
- Même observation pour les hints en dur dans `risk-framework.tsx:95,104,144-145`, `executive-summary.tsx:69`, `allocation-breakdown.tsx:72,167`, `cover.tsx:36,65` (chacun cite manuellement `methodology v1.0`).

À ce jour aucun de ces textes ne contient de forbidden word, mais l'enforcement CLAUDE.md §5 reste partiel : tout copywriter qui édite `route.tsx:528` pourrait ajouter "guaranteed" sans déclencher d'erreur de build.

**Recommandation** : faire passer tous les textes statiques de PDF par `assertNoForbiddenWords` en **build-time test** (Vitest snapshot sur le fichier), pas en runtime. C'est la même règle que pour `rebalancing-rules.ts` (déjà couvert).

### P1 — `assertCitesAssumption` absent du `recommendation` (mining-health)

**Fichier** : `src/lib/agents/mining-health.ts:148`

Le system prompt impose : `The summary MUST reference at least one assumption`. Le `recommendation` ("consider", "suggest", "review") n'a **pas** d'exigence d'assumption — c'est cohérent avec le prompt ("recommendation is a suggestion"). Aucune incohérence stricte, mais asymétrique vs `risk-explanation` où chaque `top_risks[].explanation` ET le `overall_summary` exigent assumption. Si demain l'ops manager imprime la `recommendation` seule dans un PDF, la traçabilité d'hypothèse manque.

### P2 — Assumptions citées vs réellement consommées : pas de vérif sémantique

**Fichiers concernés** : `src/lib/engine/vaults.ts:73-77` · `src/lib/agents/investor-memo.ts:159-160` · validator `assertCitesAssumption`

- `VAULT_YIELD.assumptions` contient 3 strings courtes, **génériques** (`"Balanced sleeve mix..."`, `"Monthly USDC distributions..."`, `"Outputs are projections, not guaranteed."`).
- `assertCitesAssumption` accepte n'importe quelle inflexion d'`assume*` / `hypoth?se`. Le test passe dès que la sortie contient le mot "assumption" — pas une assumption précise du vault.
- Donc un agent peut écrire `"Under the assumption that markets behave normally"` (pure paraphrase générique) et passer le linter, sans citer la 1ʳᵉ assumption vault (`"Balanced sleeve mix; mining is the dominant yield source."`).
- L'instruction prompt `cite at least one verbatim or by clear paraphrase` repose entièrement sur le respect du modèle — pas vérifiable.

**Findings concret** : l'audit demandait `"BTC vol 60% cité mais reçu autrement"`. Cas non observable en l'état car les vault assumptions ne mentionnent **aucune vol numérique**. Mais MC v2.0 *introduit* `"BTC GBM σ=60%/yr"` dans le tooltip du `MonteCarloReview`. Si la vol passe à 80% dans l'input MC mais le narratif cite encore "60%" (parce que pas re-template), → P0 sémantique. Pour l'instant non câblé.

### P2 — Sources de vérité dupliquées pour FORBIDDEN_WORDS

8 endroits définissent la liste : `validators.ts` (canonique), `engine/scenario.ts`, `engine/backtest.ts`, `engine/btc-tactical.ts`, `engine/rebalancing-rules.ts`, `hooks/use-forbidden-words.ts`, `notifications/router.ts`, `app/admin/vaults/actions.ts`. Commentaires "keep in sync" sont volontaires (engine doit rester pure-fn sans import de `src/lib/agents/`), mais la dérive est inévitable à l'échelle. Aucune n'est désynchro aujourd'hui (vérifié visuellement).

### Conformité (rien à signaler)

- **§4 structured outputs** : ✅ 4 schémas Zod `.strict()`, `extractJson` strip défensif des fences markdown, fail-fast si parse KO.
- **§5 forbidden words** : ✅ tous les champs texte de sortie sont lintés ; négations exemptées proprement.
- **§10 assumptions + not guaranteed** : ✅ chaque agent inline les 2 disclaimers en system prompt ; memo exige `disclaimer` verbatim.
- **ADR-007 (Kimi K2.6)** : ✅ tous les agents pinnent `kimi-k2.6` comme model id par défaut, `callLlm` route via Hypercli.
- **Engine purity #6** : ✅ les loaders (`loaders/vault.ts`, `mining.ts`, `distribution.ts`) sont `import "server-only"` + lecture Prisma + transformation Decimal→number. Aucune I/O dans `src/lib/engine/*` (vérifié par grep). `loaders/mining.ts:159` appelle `fetchHashprice()` puis `computeMiningRevenue()` (engine pure-fn) en dehors de l'engine — correct.
- **User context (P1)** : `scenario-narrative` + `investor-memo` chargent un 2ᵉ system block `loadUserAgentProfile` / `loadUserMemory` avec garde try/catch best-effort (jamais bloquant). `user-context.ts:230` lint `customInstructions` via `assertNoForbiddenWords` avant injection.

---

## Recommandations (priorisées)

1. **(P0 méthodo)** Remplacer `METHODOLOGY_VERSION` constante par un champ obligatoire dans `ScenarioOutput`/`MonteCarloOutput`/`BacktestOutput` (déjà partiellement présent dans `assumptions`). Les agents lisent la version depuis l'input et l'inlinent dans le prompt à chaque run. Pas de constante module-level.

2. **(P0 multi-vault)** Dans `loadMemoInput`, si `vaultId !== "yield"` et qu'aucune `VaultSnapshot` n'est filtrable par vault, **throw** plutôt que d'emprunter les KPIs Yield. Bloquer la régression silencieuse identifiée par le commentaire du code lui-même.

3. **(P1 PDF)** Wrap statique : un Vitest qui scanne tous les fichiers `src/lib/pdf/**/*.tsx` + `src/app/api/statements/**/*.tsx`, extrait les littéraux string > 80 chars et leur applique `assertNoForbiddenWords`. Filet de sécurité build-time.

4. **(P1 mining recommendation)** Aligner sur `risk-explanation` : ajouter `assertCitesAssumption(validated.recommendation)` ou retirer l'exigence du `summary` — homogénéiser le contrat.

5. **(P2 assumption sémantique)** Renforcer `assertCitesAssumption` pour exiger qu'au moins une des `vault.assumptions` (passées en input) apparaisse par recherche substring case-insensitive (au moins un fragment ≥ 30 chars). Sinon → fail.

6. **(P2 FORBIDDEN_WORDS dedup)** Acceptable en l'état (engine purity > DRY). Si la liste évolue, ajouter un test cross-file qui compare les 8 sources et fail si elles divergent.

7. **(Bonus traçabilité)** Persister `agent_methodology_version` sur `ScenarioRun`, `LlmRun`, `ReportExport` (déjà fait sur ce dernier ligne 61 de `investor-memo-monthly.ts` via constante — la rendre dynamique).

---

**Fin du rapport.**
