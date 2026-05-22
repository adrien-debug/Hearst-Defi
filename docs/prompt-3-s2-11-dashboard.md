# Prompt 3 — S2-11 : Réduction du monolithe dashboard admin

Copie-colle ce bloc **intégralement** dans Claude :

---

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
