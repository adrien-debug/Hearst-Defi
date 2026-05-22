---
description: Build production — vérifie typecheck, lint, puis build
---

# /dev-build — Production Build

## Objectif
Construire l'application en production avec toutes les vérifications préalables.

## Commande

```bash
# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Build production
pnpm build
```

## Si erreur typecheck
- Lire le fichier et la ligne concernée
- Corriger le type (pas de `any`, pas de `as unknown as`)
- Re-lancer `pnpm typecheck`

## Si erreur lint
- Lire le message ESLint
- Corriger selon les règles du projet (no-explicit-any: error)
- Re-lancer `pnpm lint`

## Si erreur build
- Lire le stack trace
- Vérifier les imports (pas de cross-project)
- Vérifier les variables d'environnement (`src/lib/env.ts`)
- Corriger et re-lancer `pnpm build`

## Rapport
```
🔨 Build Report
━━━━━━━━━━━━━━━
Typecheck : ✅ / ❌
Lint      : ✅ / ❌
Build     : ✅ / ❌

Durée : [auto]
```
