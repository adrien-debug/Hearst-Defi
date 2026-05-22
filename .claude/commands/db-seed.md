---
description: Seed la base de données avec les données initiales
---

# /db-seed — Prisma Seed

## Objectif
Remplir la base de données avec les données de seed définies dans `prisma/seed.ts`.

## Commande

```bash
pnpm db:seed
```

## Quand l'utiliser
- Première installation du projet
- Après un `db:push` sur une base vide
- Réinitialisation des données de test

## Rapport
```
🗄️  Prisma Seed
━━━━━━━━━━━━━━━
Fichier : prisma/seed.ts
Status  : ✅ Seedé / ❌ Erreur

Données insérées : [liste des entités]
```
