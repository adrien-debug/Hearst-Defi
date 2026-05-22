---
description: Audit shadows et glows — ombres, halos, focus rings
---

# /ds-shadows — Design System Shadows Audit

## Objectif
Vérifier que les shadows et glows utilisent les tokens `--ct-shadow-*` et `--ct-glow-*`.

## Commande

### Tokens autorisés
- `--ct-shadow-soft`
- `--ct-shadow-elevated`
- `--ct-shadow-depth`
- `--ct-glow-subtle`
- `--ct-glow-soft`
- `--ct-glow-strong`
- `--ct-glow-dot`
- `--ct-shadow-focus-ring` (`0 0 0 3px var(--ct-glow-soft)`)

### Vérification
```bash
rg -n 'shadow-\[|box-shadow.*[0-9]|drop-shadow' src/app src/components --type tsx
```

### Focus ring
Vérifier que les éléments cliquables actifs utilisent `--ct-shadow-focus-ring`.

### Rapport
```
💡 DS Shadows Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Tokens shadow utilisés
✅/❌ Tokens glow utilisés
✅/❌ Focus ring sur éléments interactifs
✅/❌ Pas de shadows arbitraires

Violations shadows : [liste]
Recommandations    : [actions]
```
