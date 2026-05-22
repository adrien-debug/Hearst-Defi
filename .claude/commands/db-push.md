---
description: Push le schema Prisma vers la base de données (dev only)
---

# /db-push — Prisma DB Push

## Objectif
Synchroniser le schema Prisma avec la base de données de développement (SQLite).

## ⚠️ Avertissement
Cette commande est pour le développement local uniquement. Elle écrase la structure sans créer de migration nommée.

## Commande

```bash
pnpm db:push
```

## Quand l'utiliser
- Prototype rapide en local
- Changements de schema fréquents en développement
- **PAS en production** (utiliser `db:migrate`)

## Vérification
Vérifier que `prisma/dev.db` est mis à jour.

## Rapport
```
🗄️  Prisma DB Push
━━━━━━━━━━━━━━━━━━
Base     : SQLite (dev.db)
Action   : Schema sync (no migration history)
Status   : ✅ Pushé / ❌ Erreur

⚠️  Dev only — pas pour la production
```
