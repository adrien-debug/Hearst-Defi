---
description: Audit motion — transitions, durées, easing, animations, pas d'effets gratuits
---

# /ds-motion — Design System Motion Audit

## Objectif
Vérifier que les animations respectent les règles du design system. Pas d'animations gratuites.

## Commande

### 1. Durées autorisées
Vérifier que seules ces durées sont utilisées :
- `--ct-dur-fast: 150ms`
- `--ct-dur-base: 220ms`
- `--ct-dur-slow: 400ms`

Interdit : `duration-1000`, `duration-[2s]`, transitions > 500ms.

```bash
rg -n 'duration-|transition.*[0-9]+ms|transition.*[0-9]+s' src/app src/components --type tsx
```

### 2. Easing
Vérifier que l'easing utilisé est :
- `--ct-ease: cubic-bezier(.2,.7,.2,1)`

### 3. Animations interdites
Vérifier l'absence de :
- Parallax
- Scroll-triggered effects
- Animations infinies (sauf loaders/skeletons)
- `animate-bounce`, `animate-pulse` sur des éléments persistants

```bash
rg -n 'animate-bounce|animate-pulse|parallax|scroll-trigger|infinite' src/app src/components --type tsx
```

### 4. Transitions conditionnelles
Vérifier que les transitions sont appliquées sur :
- `hover` → état hover
- `focus` → état focus
- `active` → état actif
- Pas de transition sur `all` (préciser la propriété)

### 5. Rapport
```
✨ DS Motion Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Durées — 150/220/400ms only
✅/❌ Easing — cubic-bezier(.2,.7,.2,1)
✅/❌ Animations interdites — absentes
✅/❌ Transitions — propriétés précises

Violations motion : [liste]
Recommandations : [actions]
```
