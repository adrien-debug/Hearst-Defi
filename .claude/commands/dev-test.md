---
description: Lance les tests — unitaires (Vitest) + E2E (Playwright)
---

# /dev-test — Test Runner

## Objectif
Exécuter la suite de tests complète ou ciblée.

## Commandes disponibles

### Tests unitaires (Vitest)
```bash
pnpm test
```

### Tests E2E (Playwright)
```bash
pnpm test:e2e
```

### Tests complets
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e
```

### Test ciblé (fichier spécifique)
```bash
pnpm vitest run src/lib/engine/[fichier].test.ts
```

## Si échec
1. Lire le message d'erreur
2. Identifier le fichier de test concerné
3. Lire le test et le code testé
4. Corriger le code (pas le test, sauf si le test est obsolète)
5. Re-lancer

## Rapport
```
🧪 Test Report
━━━━━━━━━━━━━
Unit tests  : ✅ X passed / ❌ X failed
E2E tests   : ✅ X passed / ❌ X failed
Coverage    : [si disponible]

Fichiers en échec : [liste]
```
