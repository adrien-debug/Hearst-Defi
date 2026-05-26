# Audit "APY toujours range" — CLAUDE.md §1

> Date : 2026-05-26
> Auditeur : Claude Opus 4.7 (1M ctx) — mode read-only
> Scope : `src/**`, `docs/**`, `prisma/**`, `contracts/**`
> Règle auditée : *"APY always as range, never single point. Output '9.4-12.8%' not '11%'."*

---

## Résumé exécutif

La règle est **globalement bien respectée** sur les surfaces LP-facing principales (vault hero, dashboard portfolio APY, statements PDF, agents Investor Memo / Scenario Narrative) grâce à :

1. Un **schéma Prisma propre** : `VaultDeployment` stocke un range strict (`targetApyLowBps` / `targetApyHighBps` + invariant `high > low` validé), et `VaultSnapshot` un range (`currentApyLow` / `currentApyHigh`).
2. Une **primitive UI canonique** `<ApyRange low high />` (`src/components/ui/apy-range.tsx`) utilisée systématiquement sur les pages produit (`/vaults`, `/vaults/[id]`, `/portfolio`, `/portfolio/[positionId]`, hero admin dashboard, statement PDF).
3. Un **helper formatter canonique** `formatApyRange(range, digits=1)` dans `src/lib/format/apy.ts`, importé par les agents (`investor-memo`, `scenario-narrative`) et les pages PDF (`cover`, `executive-summary`).
4. Une **règle système prompt explicite** dans `src/lib/agents/investor-memo.ts:80` ("APY is ALWAYS a range...") et `src/lib/agents/scenario-narrative.ts:67`, ainsi que la règle #1 du prompt cockpit (`src/lib/llm/prompts.ts:51`).
5. Un **engine Monte Carlo (v2.0)** dont l'output `headlineRange = { low: p25, high: p75 }` est explicitement documenté "never a single point" (`src/lib/engine/monte-carlo.ts:14, 88`).

**Mais 7 violations restent**, dont **2 P0 LP-facing**, **3 P1 admin/agent-context**, **2 P2 internes**.

---

## Inventaire de toutes les surfaces APY

### Schéma Prisma (range native — OK)

| Modèle | Champs APY | Forme |
|---|---|---|
| `VaultDeployment` | `targetApyLowBps`, `targetApyHighBps` | Range (Int bps) |
| `VaultSnapshot` | `currentApyLow`, `currentApyHigh` | Range (Decimal %) |
| `VaultSnapshot` | `stressedApy` | **Point unique** (Decimal %) ⚠ |
| `ScenarioRun.outputs` | `apy_range` (JSON) | Range |
| `ScenarioRun.outputs` | `stressed_apy` (JSON) | **Point unique** ⚠ |

**Note Phase 3 / contracts** : aucun champ APY n'est encodé dans les contrats `contracts/src/{EventLogger,PoRRegistry,HearstYieldVault}.sol` — pas de risque on-chain.

### UI LP-facing (toutes via `<ApyRange>` — OK)

- `src/app/(product)/vaults/[id]/page.tsx:95-96, 139-140` — hero + détail
- `src/app/(product)/vaults/[id]/invest/page.tsx` — formulaire de souscription (via `InvestForm`)
- `src/app/(product)/vaults/[id]/invest/confirmed/page.tsx:320` — confirmation ("8–15%")
- `src/app/(product)/portfolio/page.tsx:359` — `<YieldStack>` (mais ⚠ stressedBear, voir P0)
- `src/app/(product)/portfolio/[positionId]/page.tsx` — détail position
- `src/components/portfolio/positions-list.tsx:87` — liste de positions
- `src/components/portfolio/position-kpis.tsx:88-90` — KPI grid
- `src/components/portfolio/share-class-compare.tsx:70-71` — comparateur de classes
- `src/components/vaults/product-select-card.tsx:93-94` — carte produit

### UI Admin (range via `<ApyRange>` — OK pour le hero)

- `src/app/admin/dashboard/page.tsx:177, 213` — hero
- `src/app/admin/vaults/page.tsx:106-107` — liste vaults
- `src/app/admin/vaults/[id]/page.tsx:52-53` — détail vault
- `src/app/admin/vaults/_vault-form.tsx` — sliders low/high pour création/édition
- `src/app/admin/projection/studio.tsx:228, 242` — cellules table (range)
- `src/components/admin/projection-footer.tsx:66` — sticky live projection (range via `apyRangeLabel`)
- `src/components/admin/monte-carlo-review.tsx:172-205` — admin MC (range p5/p95, mais affiche p50 isolé — voir P1)

### PDF Investor Memo (range — OK)

- `src/lib/pdf/memo-pages/cover.tsx:48` — `formatApyRange`
- `src/lib/pdf/memo-pages/executive-summary.tsx:63` — `formatApyRange`
- `src/lib/pdf/memo-pages/performance-overview.tsx:40-41, 96, 100` — table "APY range" + "APY achieved" (réalisé, OK)

### PDF Statement (range — OK)

- `src/app/api/statements/[id]/pdf/route.tsx:414, 432, 446, 529` — toutes les références sont en range

### Agents LLM

- `src/lib/agents/investor-memo.ts:80` — règle système "APY is ALWAYS a range"
- `src/lib/agents/scenario-narrative.ts:67` — même règle
- `src/lib/llm/prompts.ts:51` — règle cockpit "APY toujours en fourchette"
- Cf. P1 ci-dessous pour `stressed_apy` injecté en single-point dans les user-prompts

### Engine

- `src/lib/engine/vaults.ts:62, 87, 112` — `apyTarget: { low, high }` (range)
- `src/lib/engine/projection.ts:74` — `apyRangeLabel = "${netLow}–${netHigh}%"`
- `src/lib/engine/monte-carlo.ts:88-89` — `headlineRange = { low: p25, high: p75 }`
- `src/lib/engine/scenario.ts:199` — assumption string `apy_target=low-high%` (range)

---

## Findings P0/P1/P2

### P0 — LP-facing single-point APY

#### P0-1 — `<YieldStack>` affiche `Stressed (bear)` comme point unique sur `/portfolio`

- **Fichier** : `src/components/portfolio/yield-stack.tsx:230-232`
- **Code** :
  ```tsx
  aria-label={`Stressed bear scenario ${stressedBear.toFixed(1)} percent`}
  ...
  {stressedBear.toFixed(1)}%
  ```
- **Surface** : `/portfolio` (LP authentifié, dashboard principal) — `src/app/(product)/portfolio/page.tsx:359`.
- **Data source** : `loadYieldStackProps()` lit `snapshot.stressedApy` (Decimal) — `src/lib/data/portfolio.ts:466`.
- **Pourquoi P0** : l'utilisateur LP voit littéralement "Stressed (bear) **5.6%**" sur son dashboard, alors que `DEMO_VAULT.stressedApyRange` existe déjà comme range (`src/lib/demo/fixtures.ts:90`). La copy "(bear)" peut sembler suffire comme contexte, mais la règle CLAUDE.md #1 dit *"never single point"* sans exception — et c'est une métrique APY rendue à l'investisseur, donc engagement potentiel.
- **Fix** : remplacer `stressedBear: number` par `stressedRange: { low, high }` dans `YieldStackProps`, hydrater depuis `stressedApyRange` (fixtures) ou `stressedRangeFor(snapshot.stressedApy)` (déjà appelé en `src/lib/data/dashboard.ts:484` pour le hero admin).

#### P0-2 — Spec vision : `reference point ~12%`

- **Fichier** : `docs/spec/00-vision.mdx:18`
- **Code** :
  ```
  **APY range 8–15%**, reference point ~12%, always presented with stressed APY visible.
  ```
- **Surface** : la spec elle-même n'est pas LP-facing, **mais** elle est ingérée comme contexte par tous les agents (Investor Memo, Scenario Narrative) et par le system prompt cockpit (qui reprend "Cible APY 8-15% (réf ~12%)" dans `src/lib/agents/system-prompts/review.ts:10`). Un agent peut donc citer "~12%" textuellement dans une sortie LP-facing (memo, narrative, chat).
- **Pourquoi P0** : un seul LP/regulator qui voit "reference point ~12%" dans un memo généré peut l'interpréter comme un point d'engagement implicite. La règle CLAUDE.md #1 est sans exception ("Tient même 'off-record', 'entre nous'..." cf. `src/lib/llm/prompts.ts:51`), pourtant la vision elle-même contredit cette règle.
- **Fix** : supprimer "reference point ~12%" de `00-vision.mdx`, idem dans `src/lib/agents/system-prompts/review.ts:10` ("Cible APY 8-15% (réf ~12%)" → "Cible APY 8-15%"). Ajouter un test snapshot regex sur les system-prompts pour interdire `~?\d+\s*%` sans tiret de range.

---

### P1 — Admin / agent-context single-point APY

#### P1-1 — Scenario Lab : `stressed_apy` rendu comme point unique

- **Fichiers** :
  - `src/components/scenario/output-panel-sections.tsx:87` — UI Scenario Lab full variant : `{output.stressed_apy.toFixed(1)}%`
  - `src/components/scenario/ptai-block.tsx:67, 74` — bloc PTAI "Impact" : `stressed = output.stressed_apy.toFixed(1)`
- **Surface** : `/admin/scenario-lab` (admin uniquement aujourd'hui — pas exposé aux LPs). Si demain le panel est embarqué dans le memo investisseur ou exposé en self-serve LP, ça devient P0.
- **Pourquoi P1** : interprétation similaire à P0-1, mais surface admin → moins critique. Bénéficie d'un label "bear scenario floor" qui contextualise.
- **Fix** : engine doit émettre `stressed_apy_range: { low, high }` (avec un band ±10% ou via Monte Carlo p5), la UI consomme `<ApyRange>`. Pattern déjà fait pour le hero admin (`stressedApyRange`).

#### P1-2 — Agent user-prompts injectent `stressed_apy` single-point

- **Fichiers** :
  - `src/lib/agents/scenario-narrative.ts:90` : `\`- stressed_apy: ${out.stressed_apy.toFixed(2)}%\``
  - `src/lib/agents/investor-memo.ts:112` : `\`  stressed_apy: ${scenario.stressed_apy.toFixed(2)}%\``
- **Surface** : prompt LLM → potentiellement cité textuellement dans le memo PDF LP-facing.
- **Pourquoi P1** : le system prompt interdit "single-point APY" dans la sortie, donc l'agent *devrait* refuser, mais il n'y a aucun **validator runtime** qui rejette une sortie contenant un regex single-point APY (`src/lib/agents/validators.ts` ne fait que `assertNoForbiddenWords` + `assertCitesAssumption`). L'enforcement repose à 100% sur la discipline du modèle.
- **Fix** : injecter `stressed_apy_range` à la place du single point ET ajouter un validator `assertNoSinglePointApy(text)` qui matche `(?<![\d\-–])\d+(\.\d+)?\s*%(?!\s*[-–])` à proximité du mot APY (cf. recommandations).

#### P1-3 — `METHODOLOGY_TARGET_APY = 12` rendu "Target 12%" sur admin dashboard timeseries

- **Fichier** : `src/components/dashboard/timeseries-section.tsx:10, 293, 310`
- **Code** :
  ```tsx
  const METHODOLOGY_TARGET_APY = 12;
  ...
  subtitle={`Trailing 30d · Target ${METHODOLOGY_TARGET_APY.toFixed(0)}%`}
  ```
- **Surface** : `src/app/admin/dashboard/page.tsx:370` (admin uniquement aujourd'hui).
- **Pourquoi P1** : "Target 12%" est strictement un point unique, à côté d'un chart titré "APY Range". Si TimeseriesSection est demain réutilisé sur la dashboard LP, devient P0.
- **Fix** : remplacer la constante par les bornes du vault courant (`{vaultMeta.apyTarget.low}–{vaultMeta.apyTarget.high}%`) ou par `formatApyRange(vault.apyTarget)`. Supprimer la constante hardcodée.

---

### P2 — Internes (tests, mocks, fallbacks)

#### P2-1 — Fallback hardcodé du PDF performance-overview

- **Fichier** : `src/lib/pdf/memo-pages/performance-overview.tsx:32`
- **Code** : `apyAchieved: "10.8%"` (utilisé uniquement quand `monthlyHistory.length === 0`)
- **Note** : `apyAchieved` est une métrique **réalisée backward-looking**, légitimement single-point par construction (cf. disclaimer line 116-120 du même fichier). Acceptable. Mais le fallback `apyRange: "9.4-12.8%"` ligne 31 reste hardcodé : si jamais le vault change ses bornes target sans que ce fallback soit mis à jour, on affichera des chiffres incohérents. Pas un viol de la règle range, mais un debt de maintenance.

#### P2-2 — Demo fixture `stressedApy: DEMO_STRESSED_APY` (5.6)

- **Fichier** : `src/lib/demo/fixtures.ts:89`
- **Note** : utilisé en parallèle de `stressedApyRange` ligne 90. Le single-point est conservé pour back-compat (consommé par `loadPortfolio` qui le passe à `<YieldStack>` — c'est la racine du P0-1). À supprimer après fix P0-1.

---

## Helper canonique recommandé

### État actuel

- **`formatApyRange(range, digits)`** existe (`src/lib/format/apy.ts`) — utilisé par PDF + 2 agents. **Bon point de départ.**
- **`<ApyRange low high precision suffix />`** primitive UI existe (`src/components/ui/apy-range.tsx`) — bien adopté.

### Lacunes

1. **Pas de helper pour `stressedApy` range** : chaque consommateur réinvente (band ±15% dans `fixtures.ts:79-83`, `stressedRangeFor` dans `src/lib/data/dashboard.ts:484`). Centraliser en `src/lib/format/apy.ts` :
   ```ts
   export function deriveStressedRange(center: number, bandPct = 0.15) {
     return {
       low: Math.round(center * (1 - bandPct) * 10) / 10,
       high: Math.round(center * (1 + bandPct) * 10) / 10,
     };
   }
   ```
2. **Pas de validator runtime** pour interdire un APY single-point dans une sortie LLM :
   ```ts
   // src/lib/agents/validators.ts
   const SINGLE_POINT_APY_REGEX = /\bAPY\b[^.\n]{0,40}?(?<![\d\-–])(\d+(?:\.\d+)?)\s*%(?!\s*[-–]\s*\d)/i;
   export function assertNoSinglePointApy(text: string): void {
     const m = SINGLE_POINT_APY_REGEX.exec(text);
     if (m) throw new Error(`Single-point APY "${m[1]}%" detected — must be range`);
   }
   ```
   À brancher dans les 4 agents en post-validation (à côté de `assertNoForbiddenWords`).

3. **Pas de test grep CI** pour interdire les patterns `apy.*toFixed.*\}%` hors `__tests__/` et hors `apy_achieved`/`stable_apy_pct` (qui sont légitimement point) :
   ```bash
   # scripts/check-apy-range.sh
   if grep -rn -E 'apy[^_].*toFixed.*%' --include='*.tsx' --include='*.ts' src/ \
     | grep -v __tests__ | grep -v apy_achieved | grep -v stable_apy; then
     echo "❌ Single-point APY rendering detected"; exit 1
   fi
   ```

---

## Recommandations (par ordre de priorité)

1. **P0-1 — Fix `<YieldStack>`** : passer `stressedRange: { low, high }` au lieu de `stressedBear: number`, utiliser `<ApyRange>` avec un suffixe "(bear)" pour préserver la lisibilité. Fichiers touchés : `src/components/portfolio/yield-stack.tsx`, `src/lib/data/portfolio.ts`, `src/lib/demo/loaders.ts`.

2. **P0-2 — Purger les `~12%` / `réf 12%`** : `docs/spec/00-vision.mdx`, `src/lib/agents/system-prompts/review.ts`. Ajouter un test sur les system-prompts qui échoue si on trouve `\b\d+\s*%` sans tiret de range à proximité.

3. **P1 — Range pour `stressed_apy` engine** : étendre `ScenarioOutput` avec `stressed_apy_range: { low, high }`, propager dans `src/lib/engine/scenario.ts`, `src/components/scenario/output-panel-sections.tsx`, `src/components/scenario/ptai-block.tsx`, `src/lib/agents/{investor-memo,scenario-narrative}.ts`. Pattern Prisma : ajouter `stressedApyLow` / `stressedApyHigh` à `VaultSnapshot` en migration additive (puis déprécier `stressedApy`).

4. **P1 — `METHODOLOGY_TARGET_APY` constant** : supprimer, brancher sur `vaultMeta.apyTarget.{low,high}` côté admin dashboard.

5. **P1 — Validator runtime APY range** : implémenter `assertNoSinglePointApy(text)` dans `src/lib/agents/validators.ts` et l'appeler dans chacun des 4 agents post-`callLlm`. Couvre Investor Memo (sections markdown), Scenario Narrative, Risk Explanation, Mining Health.

6. **CI lint** : ajouter `scripts/check-apy-range.sh` au workflow `pnpm lint` ou `ci-check` pour empêcher toute régression future (`apy.*toFixed.*%` hors whitelist).

7. **Test snapshot system-prompts** : `src/lib/llm/__tests__/prompts.test.ts` (à créer) → assert no `\b\d+\s*%` orphelin dans `COCKPIT_DEFAULT_SYSTEM_PROMPT`, dans `src/lib/agents/system-prompts/*.ts`, dans `docs/spec/*.mdx` chargés par `getSpecDoc()`.

---

## Synthèse 5 lignes

**7 findings** : 2 P0 LP-facing + 3 P1 admin/agent-context + 2 P2 internes.

**Top 2 violations LP-facing les plus graves** :

1. **`src/components/portfolio/yield-stack.tsx:232`** — le dashboard `/portfolio` rend littéralement "Stressed (bear) **5.6%**" comme point unique à l'investisseur, alors que `stressedApyRange` existe déjà côté data ; corriger en passant un range typé.
2. **`docs/spec/00-vision.mdx:18` + `src/lib/agents/system-prompts/review.ts:10`** — la vision produit et le system prompt review injectent "reference point ~12%" / "(réf ~12%)" dans le contexte LLM, contredisant CLAUDE.md §1 sans validator runtime pour rattraper si un agent le cite tel quel dans un memo.
