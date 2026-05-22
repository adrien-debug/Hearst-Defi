---
description: Lance TypeScript en mode --noEmit
---

# /dev-typecheck — TypeScript Check

## Objectif
Vérifier les types TypeScript sans émettre de fichiers.

## Commande

```bash
pnpm typecheck
```

## Configuration
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `noFallthroughCasesInSwitch: true`

## Si erreur
1. Lire le message TypeScript
2. Corriger le type (pas de `any`, pas de `as unknown as`)
3. Re-lancer `pnpm typecheck`

## Rapport
```
📘 TypeScript Report
━━━━━━━━━━━━━━━━━━━━
Status  : ✅ Pass / ❌ Fail
Erreurs : [nombre]

Si erreurs : [liste des fichiers et messages]
```
