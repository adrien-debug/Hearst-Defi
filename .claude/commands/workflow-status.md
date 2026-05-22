---
description: Affiche le status git, les fichiers modifiés, et les commits en attente
---

# /workflow-status — Git Status

## Objectif
Afficher l'état actuel du repository git.

## Commande

```bash
git status
git diff --stat
git log --oneline -5
```

## Rapport
```
📋 Git Status
━━━━━━━━━━━━━
Branch    : [nom]
Modifiés  : [liste]
Untracked : [liste]
Commits   : [liste des 5 derniers]

Actions suggérées :
- Si modifications pertinentes → /workflow-commit
- Si besoin de voir les diff → git diff [fichier]
```
