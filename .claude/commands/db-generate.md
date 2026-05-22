---
description: Génère le client Prisma à partir du schema
---

# /db-generate — Prisma Generate

## Objectif
Générer le client Prisma TypeScript à partir de `prisma/schema.prisma`.

## Commande

```bash
pnpm db:generate
```

## Quand l'utiliser
- Après modification de `prisma/schema.prisma`
- Après pull d'une branche avec des changements de schema
- Avant `db:push` ou `db:migrate`

## Vérification
S'assurer que `node_modules/.prisma/client/` est mis à jour.

## Rapport
```
🗄️  Prisma Generate
━━━━━━━━━━━━━━━━━━━
Schema : prisma/schema.prisma
Status : ✅ Généré / ❌ Erreur

Si erreur : lire le message et corriger le schema.prisma
```
