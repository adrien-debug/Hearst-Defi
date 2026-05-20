# Design audit — Stage 2 checklist

Fusion dashboard, factorisation scenario, primitives vaults/admin.

| ID | Item | Status |
|----|------|--------|
| S2-1 | `dashboard/page.tsx` → `MiningHealthSection`, `RiskFrameworkSection`, `TimeseriesSection` + `dashboard-adapters.ts` | [x] |
| S2-2 | Suppression composants morts (`allocation-section`, `hero-metrics`, `btc-tactical`, `advanced-toggle`) | [x] |
| S2-3 | `output-panel-shared.tsx` (buckets, confidence, `progressScoreFillClass`) | [x] |
| S2-4 | `product-bento.css` → `.bento-col-8` / `.bento-col-12` pour enfants non-`dash-cell` | [x] |
| S2-5 | `lab-shell` tabs/mode → `Button` + `--ct-radius-sm` | [x] |
| S2-6 | Vaults `ct-card` brut → `<Card>` (deposit, term-sheet, invest, preflight, regime cards) | [x] |
| S2-7 | `ProvenanceBadge` dot sans `style` inline | [x] |
| S2-8 | `roadmap-item-row` → `statusDotClass` (plus `statusDotColor`) | [x] |
| S2-9 | Harmoniser tous `--radius-*` → `--ct-radius-*` dans `src/` | [ ] backlog |
| S2-10 | Fusion complète `output-panel` + `output-panel-compact` (un seul composant) | [ ] backlog |
| S2-11 | Réduire monolithe `dashboard/page.tsx` (extraire bento KPI / allocation) | [ ] backlog |

**Vérif :** `pnpm typecheck` OK · `allocation-colors` tests 3/3 OK
