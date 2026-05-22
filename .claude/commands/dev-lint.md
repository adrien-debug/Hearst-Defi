---
description: Lance ESLint sur le projet
---

# /dev-lint — Lint

## Objectif
Exécuter ESLint sur le code source.

## Commande

```bash
pnpm lint
```

## Configuration
- `eslint-config-next/core-web-vitals`
- Règles TypeScript
- `no-explicit-any: error`

## Si erreur
1. Lire le message ESLint
2. Corriger le code (pas la config, sauf si la règle est incorrecte)
3. Re-lancer `pnpm lint`

## Rapport
```
🔍 Lint Report
━━━━━━━━━━━━━
Status  : ✅ Pass / ❌ Fail
Erreurs : [nombre]

Si erreurs : [liste des fichiers et messages]
```
