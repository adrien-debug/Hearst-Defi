---
description: Audit radius — border-radius, tokens de radius, pas de valeurs arbitraires
---

# /ds-radius — Design System Radius Audit

## Objectif
Vérifier que les border-radius utilisent les tokens `--ct-radius-*`. Aucune valeur arbitraire.

## Commande

### Tokens autorisés
- `--ct-radius-sm: 0.375rem`
- `--ct-radius-md: 0.5rem`
- `--ct-radius-lg: 0.75rem`
- `--ct-radius-xl: 1rem`
- `--ct-radius-full: 9999px`

### Alias
- `--radius-card = lg`
- `--radius-button = full`
- `--radius-modal = xl`
- `--radius-input = md`

### Vérification
```bash
rg -n 'rounded-\[|radius.*[0-9]+px|border-radius.*[0-9]' src/app src/components --type tsx
```
Résultat attendu : vide (ou cas documentés).

### Rapport
```
🟠 DS Radius Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Tokens --ct-radius-* utilisés
✅/❌ Alias respectés (card, button, modal, input)
✅/❌ Pas de valeurs arbitraires

Violations radius : [liste]
Recommandations   : [actions]
```
