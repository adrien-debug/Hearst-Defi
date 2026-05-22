---
description: Commit les changements avec un message conventionnel
---

# /workflow-commit — Git Commit

## Objectif
Créer un commit avec un message conventionnel.

## Commande

### 1. Vérifier les changements
```bash
git diff --stat
git status
```

### 2. Stage les fichiers pertinents
```bash
git add [fichiers]
```

### 3. Commit avec message conventionnel
Format : `[type](scope): description`

Types :
- `feat` — nouvelle fonctionnalité
- `fix` — correction de bug
- `docs` — documentation
- `style` — formatage (pas de changement de code)
- `refactor` — refactorisation
- `test` — tests
- `chore` — tâches de maintenance

Scopes : `ui`, `engine`, `agent`, `sc`, `db`, `auth`, `api`, `admin`, `dashboard`, `scenario`, `proof`, `memo`

Exemples :
```
feat(ui): add scenario lab output panel
fix(engine): correct APY range calculation
docs(spec): update methodology v1.0
refactor(db): normalize allocation table
```

### 4. Push
```bash
git push
```

## Rapport
```
📦 Commit Report
━━━━━━━━━━━━━━━
Fichiers  : [liste]
Message   : [message]
Hash      : [hash]
Status    : ✅ Committé et pushé / ❌ Erreur
```
