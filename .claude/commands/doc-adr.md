---
description: Liste et lit les Architecture Decision Records
---

# /doc-adr — Architecture Decision Records

## Objectif
Lister et lire les ADR (Architecture Decision Records).

## Commande

### Lister les ADR
```bash
ls -la docs/decisions/
```

### Lire un ADR
```bash
cat docs/decisions/ADR-[numéro]-[titre].md
```

## Règle
> Les ADR sont append-only. On ajoute de nouvelles décisions, on ne modifie pas les anciennes (sauf correction de typo).

## Quand créer un ADR
- Choix d'architecture non trivial
- Changement de stack technologique
- Décision de design avec trade-offs

## Format d'un ADR
```markdown
# ADR-XXX: Titre

## Contexte
[description du problème]

## Décision
[ce qui a été décidé]

## Conséquences
[positives et négatives]

## Alternatives considérées
[et pourquoi rejetées]
```

## Rapport
```
📋 ADRs disponibles
━━━━━━━━━━━━━━━━━━━━
[liste des ADRs]
```
