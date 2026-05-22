---
description: Audit code complet — types, any, imports cross-projet, server-only
---

# /audit-code — Code Quality Audit

## Objectif
Auditer la qualité du code selon les règles du projet.

## Commande

### 1. Types — pas de `any`
```bash
rg -n '\bany\b' src/ --type ts --type tsx | grep -v 'node_modules' | grep -v '\.d\.ts'
```
Résultat attendu : vide (sauf cas documentés).

### 2. Pas de `as unknown as`
```bash
rg -n 'as unknown as' src/ --type ts --type tsx
```
Résultat attendu : vide.

### 3. Imports cross-projet (interdit)
```bash
rg -n 'hearst-connect/' src/
```
Résultat attendu : vide.

### 4. `server-only` sur modules serveur
Vérifier que les modules utilisant `fs`/`prisma` importent `server-only` :
```bash
rg -n 'import "server-only"' src/lib/ --type ts
```

### 5. Pas de `useEffect` pour le data fetching
```bash
rg -n 'useEffect.*fetch|useEffect.*axios|useEffect.*api' src/ --type tsx
```
Résultat attendu : vide (utiliser Server Components ou Server Actions).

### 6. `cn()` utilisé partout
```bash
rg -n 'className=\{`\$\{' src/ --type tsx
```
Résultat attendu : vide (utiliser `cn()` pour les classes conditionnelles).

### 7. Rapport
```
🔍 Code Audit Report
━━━━━━━━━━━━━━━━━━━━━
✅/❌ Pas de `any`
✅/❌ Pas de `as unknown as`
✅/❌ Pas d'imports cross-projet
✅/❌ `server-only` sur modules serveur
✅/❌ Pas de `useEffect` pour data fetching
✅/❌ `cn()` utilisé pour classes conditionnelles

Violations : [liste]
Actions    : [corrections]
```
