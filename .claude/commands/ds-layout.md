---
description: Audit et validation du layout — rails, zones, halo, bento grid, alignements, superpositions
---

# /ds-layout — Design System Layout Audit

## Objectif
Vérifier que tous les layouts respectent les invariants du design system. Aucune valeur magique, aucun débordement, aucune superposition incorrecte.

## Commande

### 1. Rails — invariants
Vérifier dans `src/app/**` et `src/components/**` :
- Rail gauche : `--ct-rail-left: 88px` (fixe)
- Rail droit : `--ct-rail-right: 420px` (chat Kimi uniquement)
- Aucun autre rail ne doit exister

```bash
rg -n 'rail-left|rail-right|ct-rail' src/app src/components --type tsx
```

### 2. Zone contenu — `.ct-page-area`
Vérifier :
- Padding : `32px 40px 80px` (via token ou valeur exacte)
- Scrollable : `overflow-y: auto` ou équivalent
- Halo central appliqué : `radial-gradient(ellipse 80% 70% at 50% 45%, ...)`

### 3. Bento Dashboard — grille 12 colonnes
Vérifier :
- Grille 12 colonnes
- Gaps : `1px` sur `--ct-border-soft`
- Cellules : `--ct-bg-deep`
- Border-radius : `var(--ct-radius-lg)`

### 4. Alignements — audit des flex/grid
Vérifier l'absence de :
- `px` magiques pour le spacing (utiliser `--ct-space-*` ou utilitaires Tailwind)
- `margin`/`padding` arbitraires sans token
- `position: absolute` sauf pour overlays/tooltips modaux

```bash
rg -n '\b[0-9]+px\b' src/app src/components | grep -vE '(border|transition|animation|outline|radius)'
```

### 5. Superpositions (z-index)
Vérifier que seules ces valeurs sont utilisées :
- `--ct-z-base: 1`
- `--ct-z-raised: 10`
- `--ct-z-bottom-bar: 30`
- `--ct-z-dropdown: 40`
- `--ct-z-rail: 50`
- `--ct-z-overlay: 100`
- `--ct-z-rail-tooltip: 100`
- `--ct-z-modal: 1000`

Aucun `z-index: 9999`, `z-[999]`, `z-50` arbitraire.

```bash
rg -n 'z-index|z-\[' src/app src/components --type tsx
```

### 6. Chat IA — interdiction
Vérifier qu'aucun chat IA n'existe en dehors du rail droit :
```bash
rg -n 'chat|Chat|AI|assistant|kimi' src/app src/components --type tsx | grep -v 'rail-right\|ct-rail-right\|cockpit-chat'
```

### 7. Rapport
```
📐 DS Layout Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Rails — invariants respectés
✅/❌ Zone contenu — padding + halo
✅/❌ Bento — grille 12 col + gaps
✅/❌ Alignements — pas de px magiques
✅/❌ Superpositions — z-index valides
✅/❌ Chat IA — uniquement rail droit

Violations layout : [liste]
Recommandations : [actions]
```
