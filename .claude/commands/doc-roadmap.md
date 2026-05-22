---
description: Affiche le statut de la roadmap
---

# /doc-roadmap — Roadmap Status

## Objectif
Afficher l'état actuel de la roadmap produit.

## Commande

### Lire la roadmap statique
```bash
cat docs/roadmap.json | head -100
```

### Vérifier le statut dans l'UI admin
La source de vérité dynamique est dans `/admin/roadmap`.

### Vérifier les validations Prisma
```bash
pnpm db:studio
# Table RoadmapValidation
```

## Règle
> Chaque PR doit référencer un item de la roadmap. Mettre à jour le statut via l'UI admin après implémentation.

## Flow canonique
1. Lire `docs/roadmap.json` pour trouver l'item
2. Coder la feature
3. Mettre à jour le statut dans `/admin/roadmap`
4. Coller l'URL de la PR dans l'evidence URL

## Rapport
```
🗺️  Roadmap Status
━━━━━━━━━━━━━━━━━━━
Phases     : [nombre]
Semaines   : [nombre]
Items      : [nombre total]
Done       : [nombre done/validated]
En cours   : [nombre in-progress]

Prochaines milestones : [liste]
```
