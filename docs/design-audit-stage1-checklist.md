# Design audit — Stage 1 checklist

> Suite du [stage 0](./design-audit-stage0-checklist.md).

## P1 — Layout produit

| # | Point | Statut |
|---|--------|--------|
| S1.1 | `product-bento.css` (bento + KPI + page shell) | [x] |
| S1.2 | `dashboard.css` importe `product-bento.css` | [x] |
| S1.3 | `portfolio/page.tsx` importe `product-bento.css` (régression layout corrigée) | [x] |
| S1.4 | `charts-shared.css` légende → `var(--ct-text-xs)` | [x] |

## P1 — Scenario / typo / motion

| # | Point | Statut |
|---|--------|--------|
| S1.5 | `preset-bar` → primitive `Button` | [x] |
| S1.6 | `duration-150` / `[150ms]` → `var(--ct-dur-fast)` (composants) | [x] |
| S1.7 | `output-panel-compact` titres → `.h4` | [x] |
| S1.8 | `compare-mode` empty `min-h-80` (= lab-shell) | [x] |
| S1.9 | `risk-framework` composite `text-3xl` (token aligné) | [x] |

## P1 — Vaults / proof

| # | Point | Statut |
|---|--------|--------|
| S1.10 | `product-select-card` → `<Card>` | [x] |
| S1.11 | `vaults/[id]/page` sticky CTA → `<Card>` | [x] |
| S1.12 | `proof-card` badge inline → `<Badge>` | [x] |
| S1.13 | `dynamic-allocation-cards` → `.stat-value` | [x] |

## Reporté stage 2

| # | Point | Statut |
|---|--------|--------|
| S2.1 | `components/dashboard/*` orphelins — supprimer ou brancher page | [ ] |
| S2.2 | `lab-shell` tabs → `Button` / `.ct-seg-btn` | [ ] |
| S2.3 | Fusion `output-panel` / `output-panel-compact` | [ ] |
| S2.4 | Vaults restants `ct-card` brut → `<Card>` | [ ] |
| S2.5 | Harmoniser `--radius-*` vs `--ct-radius-*` | [ ] |
| S2.6 | `provenance-badge` / roadmap dots sans `style` | [ ] |

## Vérif

| Commande | Statut |
|----------|--------|
| `pnpm typecheck` | [x] 2026-05-21 |
