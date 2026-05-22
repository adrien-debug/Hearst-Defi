---
description: Crée et applique une migration Prisma nommée
---

# /db-migrate — Prisma Migrate

## Objectif
Créer une migration nommée et l'appliquer à la base de données.

## Commande

```bash
pnpm db:migrate
```

## Processus
1. Prisma détecte les changements entre le schema et la DB
2. Génère un fichier de migration dans `prisma/migrations/`
3. Applique la migration

## Nommage des migrations
Utiliser des noms descriptifs :
- `add_vault_snapshot_table`
- `add_mining_metrics_fields`
- `rename_allocation_to_position`

## Quand l'utiliser
- Changements de schema en production
- Ajout de nouvelles tables
- Modifications de colonnes existantes

## Rapport
```
🗄️  Prisma Migrate
━━━━━━━━━━━━━━━━━━
Migration : [nom]
Status    : ✅ Créée et appliquée / ❌ Erreur

Fichier   : prisma/migrations/[timestamp]_[nom]/migration.sql
```
