---
description: Audit complet — exécute tous les audits (code, sécurité, design system)
---

# /audit-full — Full Project Audit

## Objectif
Exécuter l'audit complet du projet en chaînant tous les sous-audits.

## Commande

Exécute séquentiellement :
1. `/audit-code` — Code quality
2. `/audit-security` — Security
3. `/ds-full` — Design system complet

## Rapport final

```
═══════════════════════════════════════════════════════════════
🔍 FULL PROJECT AUDIT — Hearst Connect
Date : [auto]
═══════════════════════════════════════════════════════════════

[Insérer rapport /audit-code]

[Insérer rapport /audit-security]

[Insérer rapport /ds-full]

═══════════════════════════════════════════════════════════════
📊 RÉCAPITULATIF GLOBAL
═══════════════════════════════════════════════════════════════
Code       : ✅ Pass / ❌ Fail
Security   : ✅ Pass / ❌ Fail
DS Tokens  : ✅ Pass / ❌ Fail
DS Layout  : ✅ Pass / ❌ Fail
DS Typo    : ✅ Pass / ❌ Fail
DS Motion  : ✅ Pass / ❌ Fail
DS Primitives: ✅ Pass / ❌ Fail

Score global : X/7

🔧 Actions requises : [liste priorisée]

⚠️  Bloquant : si une catégorie est en Fail, ne pas merger.
═══════════════════════════════════════════════════════════════
```
