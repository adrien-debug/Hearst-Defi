---
description: Audit charts SVG — convention canonique dasharray, circonférence, rotation
---

# /ds-charts — Design System Charts Audit

## Objectif
Vérifier que tous les charts SVG respectent la convention canonique du design system.

## Règle canonique

```
strokeDasharray = `${arc} ${C - arc}`
// arc = (valeur/100) * C
// C = circonférence = 2πr
```

### Bug interdit
`${arc} ${C}` → gap = circonférence pleine → arcs fantômes

### Dimensions
SVG **carrées** (width = height). Un viewBox carré dans un cadre non-carré déforme le cercle en ellipse.

## Types de charts

### Donut plein
- `r="15.9155"` → C ≈ 100
- bg : `"100 0"`
- segment : `${pct} ${100-pct}` + `strokeDashoffset={-cumul}`
- SVG `transform: rotate(-90deg)`

### Jauge demi-cercle
- C = 100, arc max = 50
- bg : `"50 50"`
- fg : `${arc} ${100-arc}`

### Anneaux concentriques
- C réelle = `2πr` (r=36→226, 28→175, 20→125)
- fg : `${arc} ${C-arc}` + `transform="rotate(-90 cx cy)"`

## Commande
```bash
rg -n 'strokeDasharray|stroke-dasharray' src/app src/components --type tsx
```

Vérifier que chaque occurrence suit `${arc} ${C-arc}` (jamais `${arc} ${C}`).

## Rapport
```
📊 DS Charts Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Convention dasharray respectée
✅/❌ Pas de bug ${arc} ${C}
✅/❌ SVG carrés (width = height)
✅/❌ Rotation -90deg sur donuts

Violations charts : [liste]
Recommandations   : [actions]
```
