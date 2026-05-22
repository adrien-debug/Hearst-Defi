# Prompts d'audit Design System — Stage 2 (Backlog)

> Rôle : **Auditeur + Prompt Engineer pour Claude**
> Date d'audit : 2026-05-22
> Basé sur : `design-audit-stage0-checklist.md`, `design-audit-stage1-checklist.md`, `design-audit-stage2-checklist.md`

---

## 🎯 Exécutif — État réel du backlog Stage 2

| ID | Item | Checklist dit | Réalité code | Verdict |
|---|---|---|---|---|
| S2-9 | Harmoniser `--radius-*` → `--ct-radius-*` dans `src/` | `[ ] backlog` | **30 occurrences** de `--radius-sm/md/lg/xl/full/card/button/modal` encore utilisées dans `src/` (proof-center, scenario, dashboard, memo). `globals.css` fait des alias mais les composants n'utilisent pas les tokens CT directement. | ❌ **À faire** |
| S2-10 | Fusion `output-panel` + `output-panel-compact` | `[ ] backlog` | Les deux fichiers existent toujours. `OutputPanel` (450 lignes) dans `lab-shell.tsx`. `OutputPanelCompact` (298 lignes) dans `compare-mode.tsx`. Partagent `output-panel-shared.tsx` mais restent séparés. | ❌ **À faire** |
| S2-11 | Réduire monolithe `dashboard/page.tsx` | `[ ] backlog` | Le dashboard **produit** a été supprimé (`src/app/(product)/dashboard` n'existe plus). Le dashboard **admin** (`src/app/admin/dashboard/page.tsx`) fait **605 lignes** et contient 4 sections monolithiques avec logique inline (sparkline, donut, density matrix, distributions). | ⚠️ **À réinterpréter** — refactor du dashboard admin |

---

## 📝 Prompt 1 — S2-9 : Harmonisation radius (purement mécanique)

**Copier-coller tel quel dans Claude :**

```
Tu es un développeur frontend senior sur un projet Next.js + Tailwind + TypeScript (Hearst DeFi).

**Objectif** : Remplacer TOUTES les occurrences de variables CSS `--radius-*` non-CT par leur équivalent `--ct-radius-*` directement dans les fichiers de `src/`.

**Mapping officiel** (basé sur `globals.css`) :
- `--radius-sm` → `--ct-radius-sm`
- `--radius-md` → `--ct-radius-md`
- `--radius-lg` → `--ct-radius-lg`
- `--radius-xl` → `--ct-radius-xl`
- `--radius-2xl` → `--ct-radius-xl`
- `--radius-full` → `--ct-radius-full`
- `--radius-card` → `--ct-radius-lg`
- `--radius-button` → `--ct-radius-full`
- `--radius-modal` → `--ct-radius-xl`
- `--radius-input` → `--ct-radius-md`

**Fichiers concernés** (30 occurrences totales) :
- `src/components/proof-center/por-summary.tsx`
- `src/components/proof-center/contracts-audit-trail.tsx`
- `src/components/proof-center/event-timeline.tsx`
- `src/components/dashboard/timeseries-section.tsx`
- `src/components/scenario/rebalancing-actions.tsx`
- `src/components/scenario/backtest-panel.tsx`
- `src/components/scenario/lab-shell.tsx`
- `src/components/scenario/output-panel.tsx`
- `src/components/scenario/compare-mode.tsx`
- `src/components/memo/memo-section.tsx`

**Contrainttes non-négociables** :
1. Ne toucher à AUCUN autre token ou style.
2. Garder exactement les mêmes classes Tailwind (`rounded-[...]`).
3. Ne PAS toucher à `globals.css` (les alias peuvent rester pour compatibilité externe).
4. Après modification, `pnpm typecheck` doit passer sans erreur.
5. Vérifier visuellement que les composants concernés n'ont pas de régression de `border-radius`.

**Vérification finale** :
```bash
# Doit retourner 0 résultat
grep -r "\-\-radius-" src/ | grep -v "ct-radius"
pnpm typecheck
```
```

---

## 📝 Prompt 2 — S2-10 : Fusion OutputPanel + OutputPanelCompact

**Copier-coller tel quel dans Claude :**

```
Tu es un développeur frontend senior sur un projet Next.js + React + TypeScript (Hearst DeFi).

**Contexte** : Nous avons deux composants scénario dans `src/components/scenario/` :
- `output-panel.tsx` (450 lignes) — mode "détail complet", utilisé dans `lab-shell.tsx` (scénario solo). Contient : APY Hero, PTAI block, AI Narrative, NavSparkline, Risk & Mining 2×2, Vault Mode, Allocation (stacked bar + table), BTC Tactical, Rebalancing Actions, Assumptions, Disclaimer. Utilise `<Card>`.
- `output-panel-compact.tsx` (298 lignes) — mode "comparatif A/B", utilisé dans `compare-mode.tsx`. Contient : Header Scénario A/B, APY Hero (avec deltas vs A), Risk + Mining 2×1, Vault Mode, Allocation (table compacte sans stacked bar). Utilise `glass-panel` / `glass-panel-subtle`.
- `output-panel-shared.tsx` (35 lignes) — exports communs : `BUCKET_LABEL`, `BUCKET_COLOR`, `CONFIDENCE_VARIANT`, `progressScoreFillClass`.

**Objectif** : Fusionner `output-panel.tsx` et `output-panel-compact.tsx` en UN SEUL composant `OutputPanel` dans `src/components/scenario/output-panel.tsx`, avec une prop `variant?: "full" | "compact"` (défaut `"full"`).

**Spécification détaillée** :

1. **Props communes** (tous modes) :
   ```ts
   interface OutputPanelProps {
     output: ScenarioOutput;
     isPending?: boolean;
   }
   ```

2. **Props mode compact** (uniquement quand `variant="compact"`) :
   ```ts
   interface OutputPanelCompactProps extends OutputPanelProps {
     variant: "compact";
     presetLabel: string;
     side: "A" | "B";
     vs?: ScenarioOutput | null; // référence pour les deltas
   }
   ```

3. **Différenciation comportementale** :
   - **Full** (`lab-shell.tsx`) : garde TOUT le contenu actuel (Narrative, PTAI, NavSparkline, BTC Tactical, Rebalancing, Assumptions, Disclaimer, stacked bar). Wrapper `<Card>`.
   - **Compact** (`compare-mode.tsx`) : header scénario, APY avec delta (si `side === "B"` et `vs` fourni), Risk/Mining sans delta texte individuel (juste scores), Vault Mode, Allocation table compacte. Wrapper `glass-panel` + `glass-panel-subtle` internes. PAS de Narrative, PTAI, NavSparkline, BTC Tactical, Rebalancing, Assumptions, Disclaimer.

4. **Helpers à conserver** :
   - `AssumptionsList`, `AllocationBar` → dans `output-panel.tsx` (full only).
   - Helpers delta (`computeApyDelta`, `computeRiskDelta`, etc.) → dans `output-panel.tsx` (compact only).
   - `MODE_LABEL`, `MODE_VARIANT`, `GUARDRAIL_*` → restent dans `output-panel.tsx` si utilisés par full.

5. **Refactoring de `compare-mode.tsx`** :
   - Remplacer `import { OutputPanelCompact }` par `import { OutputPanel }`.
   - Utiliser `<OutputPanel variant="compact" side="A" presetLabel="..." output={...} />` et `<OutputPanel variant="compact" side="B" presetLabel="..." output={...} vs={outputA} />`.

6. **Refactoring de `lab-shell.tsx`** :
   - Continuer d'utiliser `<OutputPanel output={...} isPending={...} narrative={...} />` (variant full par défaut).

7. **Suppression** :
   - Supprimer `src/components/scenario/output-panel-compact.tsx`.
   - Conserver `src/components/scenario/output-panel-shared.tsx` (ne pas le fusionner, il est utile pour d'éventuels consommateurs externes).

**Contraintes non-négociables** :
1. `pnpm typecheck` passe sans erreur.
2. Aucune régression visuelle : le rendu HTML/CSS final du mode full doit être identique bit-à-bit (mêmes classes, mêmes structures).
3. Le mode compact doit préserver les deltas A/B, le layout `glass-panel`, et la densité visuelle actuelle.
4. Ne pas réintroduire de `style={{ color: ... }}` inline — utiliser les classes existantes (`bg-current`, etc.).
5. Si possible, extraire les sous-sections réutilisables (ex: `ApyHeroSection`, `RiskMiningSection`) en fonctions internes au fichier pour réduire la duplication entre full et compact, MAIS sans créer de nouveaux fichiers séparés inutiles.

**Vérification finale** :
```bash
pnpm typecheck
# S'assurer que output-panel-compact.tsx n'existe plus
ls src/components/scenario/output-panel-compact.tsx # doit échouer
```
```

---

## 📝 Prompt 3 — S2-11 : Réduction du monolithe dashboard admin

**Copier-coller tel quel dans Claude :**

```
Tu es un développeur frontend senior sur un projet Next.js 14 + React Server Components + TypeScript (Hearst DeFi).

**Contexte** : Le fichier `src/app/admin/dashboard/page.tsx` fait **605 lignes**. Il contient :
- Des helpers/formatters inline (`usdCompact`, `btcUsdFormat`, `buildSparklinePath`, `buildSparklineFillPath`, `formatDistributionDate`, `round1`, `provenanceFor`).
- Quatre sections visuelles monolithiques dans le JSX :
  1. **Performance** (AUM sparkline, APY range gauge, BTC tactical sleeve)
  2. **Allocation & Risk** (donut SVG avec stroke-dasharray, legend, RiskFrameworkSection)
  3. **Mining & Operations** (MiningHealthSection, Operational confidence gauge, TimeseriesSection)
  4. **Activity & Distributions** (events density matrix 120 cellules, distribution feed)
- Du calcul de données inline (provenance per metric, apy gauge math, density cells, distribution rows).

Le dashboard **produit** (`src/app/(product)/dashboard`) a été supprimé — il ne reste que le dashboard **admin**.

**Objectif** : Extraire ces 4 sections en composants Server Components indépendants sous `src/components/dashboard/sections/`, réduisant `page.tsx` à ~100–150 lignes (data loading + orchestration).

**Spécification détaillée** :

### A. Extraction des helpers dans `src/lib/dashboard-helpers.ts`
Créer `src/lib/dashboard-helpers.ts` et y déplacer :
- Tous les `Intl.NumberFormat` (`usdCompact`, `usdShort`, `btcUsdFormat`).
- `monthDayFmt`.
- `formatDistributionDate(d)`.
- `round1(n)`.
- `provenanceFor(intrinsic, loaderSource)`.
- `buildSparklinePath(currentValue, delta30d)`.
- `buildSparklineFillPath(currentValue, delta30d)`.

Toutes ces fonctions sont **pures**, elles n'ont aucune dépendance React ou module interne.

### B. Extraction des sections

Créer `src/components/dashboard/sections/` (dossier nouveau) avec :

1. **`performance-section.tsx`**
   ```ts
   interface PerformanceSectionProps {
     data: DashboardData; // type depuis @/lib/data/dashboard
     hashprice: HashpriceRow;
     source: "db" | "partial" | "fallback";
   }
   ```
   Contenu : AUM sparkline card, APY gauge card, BTC sleeve card.
   Calcule en interne : `aumTrendSign`, `aumTrendText`, `btcHeld`, `costBasis`, `pnlUsd`, `pnlPct`, `apyLowPos`, `apyHighPos`, `apyBandArc`, `blendedBps`, `blendedPct`.

2. **`allocation-section.tsx`**
   ```ts
   interface AllocationSectionProps {
     data: DashboardData;
     source: "db" | "partial" | "fallback";
   }
   ```
   Contenu : Donut SVG + legend + blended target row.
   Calcule en interne : `allocSegments`.

3. **`mining-ops-section.tsx`**
   ```ts
   interface MiningOpsSectionProps {
     data: DashboardData;
     hashprice: HashpriceRow;
     riskFramework: RiskFrameworkData;
     source: "db" | "partial" | "fallback";
   }
   ```
   Contenu : MiningHealthSection wrapper, Operational confidence gauge.
   Calcule en interne : `opConfArc`, `opConfDash`, `opConfOffset`.

4. **`activity-section.tsx`**
   ```ts
   interface ActivitySectionProps {
     data: DashboardData;
     source: "db" | "partial" | "fallback";
   }
   ```
   Contenu : Density matrix 120 cellules, Distribution feed.
   Calcule en interne : `eventsByDay`, `densityCells`, `distRows`.

5. **`dashboard-header.tsx`** (optionnel mais recommandé)
   Contenu : Le `<header className="dash-header">` avec eyebrow, h1, date UTC, status strip.

### C. Mise à jour de `page.tsx`

`page.tsx` doit devenir :

```tsx
import "./dashboard.css";
import { ActivitySection } from "@/components/dashboard/sections/activity-section";
import { AllocationSection } from "@/components/dashboard/sections/allocation-section";
import { DashboardHeader } from "@/components/dashboard/sections/dashboard-header";
import { MiningOpsSection } from "@/components/dashboard/sections/mining-ops-section";
import { PerformanceSection } from "@/components/dashboard/sections/performance-section";
import { RiskFrameworkSection } from "@/components/dashboard/risk-framework";
import { loadDashboardData, fetchHashprice, loadRiskFramework } from "@/lib/demo/loaders";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [data, hashprice, riskFramework] = await Promise.all([
    loadDashboardData(),
    fetchHashprice(),
    loadRiskFramework(),
  ]);

  return (
    <div className="dash-page">
      <DashboardHeader data={data} />
      <PerformanceSection data={data} hashprice={hashprice} source={data.source} />
      <AllocationSection data={data} source={data.source} />
      <MiningOpsSection data={data} hashprice={hashprice} riskFramework={riskFramework} source={data.source} />
      <ActivitySection data={data} source={data.source} />
      <p className="dash-disclaimer">...</p>
    </div>
  );
}
```

**Contraintes non-négociables** :
1. Rester en **Server Components** pour toutes les sections (pas de `"use client"`).
2. Ne PAS changer la structure HTML/CSS des sections extraites (mêmes classes, mêmes attributs aria, mêmes balises).
3. Les types doivent être importés de `@/lib/data/dashboard` ou créés si absents. Ne pas dupliquer de types.
4. Les composants existants `MiningHealthSection`, `RiskFrameworkSection`, `TimeseriesSection` restent inchangés — juste ré-importés dans les nouvelles sections si nécessaire.
5. `pnpm typecheck` passe sans erreur.
6. Le disclaimer final reste dans `page.tsx`.
7. Les calculs inline (ex: sparkline path, density cells) doivent être déplacés DANS les sections, pas conservés dans `page.tsx`.

**Bonus** (si pertinent) :
- Typage strict des props avec les types existants de `src/lib/data/dashboard.ts`.
- Si un type manque dans `src/lib/data/dashboard.ts`, l'ajouter là-bas plutôt que de le définir en inline.

**Vérification finale** :
```bash
pnpm typecheck
# page.tsx doit faire moins de 150 lignes
wc -l src/app/admin/dashboard/page.tsx
```
```

---

## 🔧 Prompt Bonus — Audit de cohérence (une fois les 3 ci-dessus faits)

**Copier-coller tel quel dans Claude :**

```
Tu es un développeur frontend senior faisant un audit de cohérence du Design System Hearst Cockpit.

**Contexte** : Les 3 items du backlog Stage 2 viennent d'être réalisés (S2-9 radius, S2-10 fusion output-panel, S2-11 refactor dashboard admin).

**Objectif** : Vérifier qu'il ne reste AUCUNE incohérence résiduelle dans `src/` :

1. **Tokens radius** : `grep -r "\-\-radius-" src/ | grep -v "ct-radius"` → doit être vide.
2. **Duplications output-panel** : `ls src/components/scenario/output-panel-compact.tsx` → doit échouer (fichier supprimé).
3. **Monolithe dashboard** : `wc -l src/app/admin/dashboard/page.tsx` → doit faire < 150 lignes.
4. **Styles dupliqués** : Chercher des `style={{ color: ... }}` inline dans les composants récemment migrés (provenance-badge, roadmap, scenario).
5. **Classes `glass-panel-subtle` vs `<Card>`** : S'assurer que `glass-panel-subtle` n'est plus utilisé là où `<Card>` devrait l'être, dans les composants récemment refactorés.
6. **Unused imports** : Vérifier qu'il n'y a pas d'imports morts dans les fichiers modifiés.

Rédiger un rapport markdown de 5–10 lignes : ✅/❌ par vérification, avec le nombre de lignes et les fichiers encore problématiques s'il y en a.
```

---

*Fin des prompts. Chaque prompt est conçu pour être copié-collé tel quel dans une session Claude avec accès au codebase.*
