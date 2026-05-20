# Design audit — Stage 0 checklist

> Fondations DS (P0). Cocher au fil des stages suivants pour le reste.

Légende : `[x]` fait en stage 0 · `[ ]` reporté stage 1+

---

## A. Systémique

| # | Point | Statut |
|---|--------|--------|
| A1 | Aligner `@theme` typo (`globals.css`) sur `--ct-text-*` (`cockpit.css`) | [x] |
| A2 | Map allocation web unique (`src/lib/allocation-colors.ts`) | [x] |
| A2b | Documenter PDF `CT_ALLOCATION` ≠ web strokes | [x] |
| A3 | Portfolio : statuts liste = donut (`active` strong, `matured` muted) | [x] |

---

## B. Fichiers / modules créés

| # | Fichier | Statut |
|---|---------|--------|
| B1 | `src/lib/allocation-colors.ts` | [x] |
| B2 | `src/lib/__tests__/allocation-colors.test.ts` | [x] |
| B3 | `src/app/(product)/charts-shared.css` (donut + legend) | [x] |

---

## C. Consommateurs allocation

| # | Fichier | Statut |
|---|---------|--------|
| C1 | `components/dashboard/allocation-section.tsx` → `allocationStrokeFor` | [x] |
| C2 | `components/scenario/output-panel.tsx` → `ALLOCATION_STROKE` | [x] |
| C3 | `components/scenario/output-panel-compact.tsx` → `ALLOCATION_STROKE` | [x] |
| C4 | `app/(product)/dashboard/page.tsx` → `allocationDashToneFor` + labels | [x] |
| C5 | `components/portfolio/allocation-donut.tsx` → `.dash-legend-dot.dot-*` | [x] |

---

## D. Portfolio / charts CSS

| # | Point | Statut |
|---|--------|--------|
| D1 | Portfolio importe `product-bento.css` (layout + charts ; stage 1) | [x] |
| D2 | `dashboard.css` importe `charts-shared.css` | [x] |
| D3 | Donut container `height: var(--ct-donut-size)` | [x] |
| D4 | Dashboard SVG donut `width/height 100%` (plus 180px fixe) | [x] |
| D5 | `allocation-section` `lg:w-[var(--ct-donut-size)]` | [x] |

---

## E. Primitives UI

| # | Fichier | Ligne / sujet | Statut |
|---|---------|---------------|--------|
| E1 | `ui/button.tsx` | `shadow-sm` → `--ct-shadow-soft` | [x] |
| E2 | `ui/badge.tsx` | `shadow-sm` → token | [x] |
| E3 | `ui/progress.tsx` | `duration-700` → `--ct-dur-slow` + `--ct-ease` | [x] |
| E4 | `ui/metric.tsx` | `drop-shadow-md` → `--ct-glow-subtle` | [x] |
| E5 | `ui/card.tsx` | `drop-shadow-sm` → `--ct-glow-subtle` | [x] |
| E6 | `ui/apy-range.tsx` | retirer `ct-status-glow-success` sur APY | [x] |
| E7 | `ui/button.tsx` | `active:scale-[0.98]` | [ ] stage 1 |
| E8 | `ui/toaster.tsx` | styles dupliqués vs `cockpit.css` Sonner | [ ] stage 1 |

---

## F. Dashboard composants

| # | Fichier | Point | Statut |
|---|---------|-------|--------|
| F1 | `mining-health.tsx` | dots → `.ct-status-dot-*` (plus inline color) | [x] |
| F2 | `risk-framework.tsx` | dots → `.ct-status-dot-*` | [x] |
| F3 | `timeseries-section.tsx` | `min-h-[var(--ct-chart-empty-h)]` | [x] |
| F4 | `timeseries-section.tsx` | `drop-shadow-sm` → glow token | [x] |
| F5 | `advanced-toggle.tsx` | `shadow-sm` → token | [x] |
| F6 | `advanced-toggle.tsx` | toggle custom `<button>` (primitive manquante) | [ ] stage 1 |
| F7 | `advanced-toggle.tsx` | `duration-300/500`, `max-h-[31.25rem]` | [ ] stage 1 |
| F8 | `risk-framework.tsx` | `text-4xl` / `sm:w-[11.25rem]` layout | [ ] stage 1 |
| F9 | `allocation-section.tsx` | `duration-500/1000`, `blur-3xl` | [ ] stage 1 |
| F10 | `dashboard.css` | `.dash-trend` `border-radius: 2px` | [ ] stage 1 |

---

## G. Scenario Lab

| # | Point | Statut |
|---|--------|--------|
| G1 | `backtest-chart` label 10px + empty `var(--ct-chart-empty-h)` | [x] |
| G2 | `nav-sparkline` label 10px | [x] |
| G3 | `compare-mode` dropdown `z-[var(--ct-z-dropdown)]` | [x] |
| G4 | `preset-bar` / `lab-shell` `<button>` → `Button` | [ ] stage 1 |
| G5 | Fusion `output-panel` + `output-panel-compact` | [ ] stage 2 |
| G6 | `glass-panel-subtle` → `Card` / padding unifié | [ ] stage 2 |
| G7 | Harmoniser `--radius-*` vs `--ct-radius-*` partout | [ ] stage 1 |
| G8 | `duration-150` → `var(--ct-dur-fast)` (lab, proof, preset…) | [ ] stage 1 |

---

## H. Proof / admin / divers

| # | Point | Statut |
|---|--------|--------|
| H1 | `proof-card.tsx` badge inline → `Badge` | [ ] stage 1 |
| H2 | `contracts-audit-trail` duration/radius mixtes | [ ] stage 1 |
| H3 | `ui/provenance-badge` dot inline `style` | [ ] stage 1 |
| H4 | `admin/roadmap-item-row` status dot inline | [ ] stage 1 |
| H5 | `hub-mode-styles` glass/blur neutralisés en hub | [ ] doc / QA |
| H6 | `error-shell` standalone inline (autorisé) | [x] N/A |

---

## I. Coexistence composants (stage 2+)

| # | Paire | Statut |
|---|-------|--------|
| I1 | `OutputPanel` / `OutputPanelCompact` | [ ] |
| I2 | `Card` / `glass-panel-subtle` | [ ] |
| I3 | `Button` / `<button>` scenario | [ ] |
| I4 | `Badge` / `ct-pill` / span success | [ ] |
| I5 | 3 implémentations donut SVG | [ ] partiel (styles partagés) |

---

## J. Vérification

```bash
pnpm typecheck
pnpm test -- allocation-colors   # si vitest configuré
rg 'BUCKET_COLOR|BUCKET_TONES' src/components src/app   # doit être vide
```

| Commande | Statut |
|----------|--------|
| `pnpm typecheck` | [x] 2026-05-21 |
| Tests `allocation-colors` | [x] 3/3 |
