---
description: Audit complet du design system — exécute tous les audits (tokens, layout, typo, motion, primitives)
---

# /ds-full — Design System Full Audit

## Objectif
Exécuter l'audit complet du design system en chaînant tous les sous-audits.

## Commande

Exécute séquentiellement :
1. `/ds-tokens` — Audit des tokens
2. `/ds-layout` — Audit du layout
3. `/ds-typo` — Audit typographie
4. `/ds-motion` — Audit motion
5. `/ds-primitives` — Audit primitives

## Rapport final

```
═══════════════════════════════════════════════════════════════
🔒 DESIGN SYSTEM FULL AUDIT — Hearst Connect
Date : [auto]
Verrou : 2026-05-20
═══════════════════════════════════════════════════════════════

[Insérer rapport /ds-tokens]

[Insérer rapport /ds-layout]

[Insérer rapport /ds-typo]

[Insérer rapport /ds-motion]

[Insérer rapport /ds-primitives]

═══════════════════════════════════════════════════════════════
📊 RÉCAPITULATIF
═══════════════════════════════════════════════════════════════
Tokens    : ✅ Pass / ❌ Fail
Layout    : ✅ Pass / ❌ Fail
Typo      : ✅ Pass / ❌ Fail
Motion    : ✅ Pass / ❌ Fail
Primitives: ✅ Pass / ❌ Fail

Score global : X/5

🔧 Actions requises :
- [liste des corrections]

⚠️  Si une violation est détectée, ne pas continuer l'implémentation.
    Stop, corriger, re-auditer.
═══════════════════════════════════════════════════════════════
```

## Règle d'or
> **Aucun nouveau token, aucune nouvelle primitive, aucune nouvelle classe utilitaire ne peut être créé sans validation explicite d'Adrien.**

Si l'audit révèle un besoin non couvert par le vocabulaire actuel :
1. **Stop l'implémentation.**
2. Rédiger une demande d'ajout avec : Quoi / Pourquoi / Pourquoi l'existant ne suffit pas / Alternative.
3. Attendre validation.
