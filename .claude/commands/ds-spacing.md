---
description: Audit spacing — espacements, gaps, paddings, margins, pas de px magiques
---

# /ds-spacing — Design System Spacing Audit

## Objectif
Vérifier que tous les espacements utilisent les tokens `--ct-space-*` ou les utilitaires Tailwind. Aucun px magique.

## Commande

### 1. px magiques (interdit pour spacing)
```bash
rg -n '\b[0-9]+px\b' src/app src/components | grep -vE '(border|transition|animation|outline|radius|width|height|top|left|right|bottom|transform|box-shadow|backdrop-filter)'
```

### 2. Tokens d'espacement autorisés
Vérifier que ces tokens sont utilisés :
- `--ct-space-0` à `--ct-space-24` (échelle 4px = 0.25rem)

### 3. Utilitaires Tailwind valides
Vérifier l'utilisation de :
- `p-1`, `p-2`, `p-4`, etc.
- `m-1`, `m-2`, `m-4`, etc.
- `gap-1`, `gap-2`, `gap-4`, etc.
- `px-*`, `py-*`, `mx-*`, `my-*`

### 4. Valeurs arbitraires interdites
```bash
rg -n 'p-\[|m-\[|gap-\[|space-\[' src/app src/components --type tsx
```
Résultat attendu : vide (ou cas documentés).

### 5. Rapport
```
📏 DS Spacing Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Pas de px magiques
✅/❌ Tokens --ct-space-* utilisés
✅/❌ Utilitaires Tailwind valides
✅/❌ Pas de valeurs arbitraires

Violations spacing : [liste]
Recommandations    : [actions]
```
