---
description: Simule la CI locale — lint + typecheck + test + build
---

# /ci-check — CI Local Simulation

## Objectif
Simuler le pipeline CI en local avant de push.

## Commande

```bash
# Pipeline CI complet
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Pipeline CI (référence `.github/workflows/ci.yml`)
1. **Lint** → `pnpm lint`
2. **Typecheck** → `pnpm typecheck`
3. **Tests unitaires** → `pnpm test` (Vitest)
4. **Tests E2E** → `pnpm test:e2e` (Playwright, non-blocking)

## Si échec
Corriger avant de push. Ne pas merger avec des tests en échec.

## Rapport
```
🔁 CI Local Simulation
━━━━━━━━━━━━━━━━━━━━━━━
Lint      : ✅ / ❌
Typecheck : ✅ / ❌
Test      : ✅ / ❌
Build     : ✅ / ❌

Status global : ✅ Prêt pour push / ❌ Corriger avant push
```
