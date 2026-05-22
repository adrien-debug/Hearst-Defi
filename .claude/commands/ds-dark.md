---
description: Audit dark mode — vérifier qu'aucun modifier dark: n'est utilisé
---

# /ds-dark — Dark Mode Audit

## Objectif
Vérifier qu'aucun modifier `dark:` n'est utilisé. Le MVP est dark-only.

## Règle
> **Dark mode only at MVP.** Colors come from CSS vars in `globals.css`; no `dark:` modifiers.

## Commande
```bash
rg -n '\bdark:' src/app src/components --type tsx
```
Résultat attendu : vide.

## Rapport
```
🌑 DS Dark Mode Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Pas de modifier dark:
✅/❌ Dark-only via CSS vars

Violations dark: : [liste]
Recommandations  : [actions]
```
