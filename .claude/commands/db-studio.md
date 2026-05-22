---
description: Ouvre Prisma Studio pour visualiser et éditer la base de données
---

# /db-studio — Prisma Studio

## Objectif
Lancer Prisma Studio pour inspecter et modifier les données en développement.

## Commande

```bash
pnpm db:studio
```

## Accès
Ouvre automatiquement `http://localhost:5555`

## Quand l'utiliser
- Inspection des données
- Correction manuelle de données de test
- Débogage des relations

## Rapport
```
🗄️  Prisma Studio
━━━━━━━━━━━━━━━━━
URL    : http://localhost:5555
Status : ✅ Lancé

Tables disponibles :
- VaultSnapshot
- Allocation
- MiningMetric
- ScenarioRun
- BacktestRun
- RebalanceEvent
- Distribution
- Proof
- ReportExport
- LlmRun
- RoadmapValidation
- Feedback
- User
- Investor
- Session
```
