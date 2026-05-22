---
description: Audit des classes utilitaires .ct-* — vérifier qu'aucune classe arbitraire n'est créée
---

# /ds-classes — Design System Utility Classes Audit

## Objectif
Vérifier que seules les classes utilitaires `.ct-*` figées sont utilisées. Aucune classe arbitraire.

## Classes autorisées

### Texte
`.ct-text-primary`, `.ct-text-body`, `.ct-text-muted`, `.ct-text-faint`, `.ct-text-strong`

### Surface
`.ct-surface-0`, `.ct-surface-1`, `.ct-surface-2`, `.ct-surface-3`, `.ct-hover-surface`

### Bordure
`.ct-border-soft`, `.ct-border-base`, `.ct-border-strong`, `.ct-divide-soft`, `.ct-divide-base`

### Status
`.ct-status-success`, `.ct-status-warning`, `.ct-status-danger`, `.ct-status-info` (+ `-bg`, `-dot-*`, `-glow-*`)

### Typo rôles
`.h1`, `.h2`, `.h3`, `.h4`, `.eyebrow`, `.stat-value`, `.stat-label`, `.body-lg`, `.body-md`, `.body-sm`, `.body-xs`, `.ct-section-title`

### Composants
`.ct-pill` (+ `.accent`), `.ct-input`, `.ct-select`, `.ct-textarea`

### Layout shell
`.ct-root`, `.ct-rail-left`, `.ct-rail-right`, `.ct-page-area`, `.ct-panels-row`, `.ct-ambient-deep`, `.ct-ambient-glow`

### Layout intra-app
`.ct-section`, `.ct-rail-intra`, `.ct-rail-item` (+ `-active`, `-tooltip`)

### Heritage
`.glass-panel`, `.glass-panel-subtle`

### Bottom bar
`.ct-bottom-bar`, `.ct-bottom-bar-inner`, `.ct-seg-track`, `.ct-seg-btn` (+ `.active`, `.primary`)

### Cards/KPI
`.ct-card`, `.ct-kpi-card`

### Prose
`.prose-spec`

## Commande
```bash
rg -n 'className=.*ct-[a-z-]+' src/app src/components --type tsx | grep -vE '\b(ct-text-primary|ct-text-body|ct-text-muted|ct-text-faint|ct-text-strong|ct-surface-0|ct-surface-1|ct-surface-2|ct-surface-3|ct-hover-surface|ct-border-soft|ct-border-base|ct-border-strong|ct-divide-soft|ct-divide-base|ct-status-success|ct-status-warning|ct-status-danger|ct-status-info|ct-pill|ct-input|ct-select|ct-textarea|ct-root|ct-rail-left|ct-rail-right|ct-page-area|ct-panels-row|ct-ambient-deep|ct-ambient-glow|ct-section|ct-rail-intra|ct-rail-item|ct-bottom-bar|ct-seg-track|ct-seg-btn|ct-card|ct-kpi-card|glass-panel|glass-panel-subtle|prose-spec|h1|h2|h3|h4|eyebrow|stat-value|stat-label|body-lg|body-md|body-sm|body-xs|ct-section-title)\b'
```

## Rapport
```
🎨 DS Utility Classes Audit Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Classes .ct-* autorisées uniquement
✅/❌ Pas de classes arbitraires
✅/❌ Pas de styles inline

Classes non autorisées : [liste]
Recommandations        : [actions]
```
