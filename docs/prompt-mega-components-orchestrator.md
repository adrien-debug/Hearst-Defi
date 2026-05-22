# Prompt Méga — Orchestrateur Opus : 407 violations dans src/components/

**Date** : 2026-05-22
**Projet** : Hearst Connect DeFi (Next.js 16 + Tailwind + TypeScript)
**Branche** : main
**Mission** : Corriger 407 violations de styles inline `[--ct-*]` dans 54 fichiers de `src/components/`

---

## 🎯 Objectif global

Remplacer TOUS les styles inline `[--ct-*]` et `text-[length:var(--ct-text-*)]` dans `src/components/` par des classes utilitaires du design system ou la syntaxe `var(--ct-*)`.

**Tu es Orchestrateur**. Tu délegues à des sous-agents par domaine fonctionnel.

---

## 📊 Répartition des 407 violations par domaine

| Domaine | Fichiers | Violations | Priorité |
|---------|----------|------------|----------|
| **scenario** | 6+ | **154** | P1 — cœur métier |
| **proof-center** | 4+ | **54** | P1 — preuve de réserves |
| **admin** | 4+ | **53** | P2 — UI admin |
| **ui** | 10+ | **47** | P0 — composants réutilisables |
| **vaults** | 5+ | **31** | P1 — pages produit |
| **proof** | 3+ | **19** | P2 — cartes de preuve |
| **dashboard** | 3+ | **19** | P2 — analytics |
| **memo** | 2+ | **11** | P2 — mémo investisseur |
| **portfolio** | 3+ | **13** | P2 — portfolio |
| **error** | 1+ | **4** | P3 — pages d'erreur |
| **demo** | 1 | **1** | P3 — toggle demo |

---

## 🤖 Stratégie d'orchestration

### Phase 1 — UI Core (P0) — 47 violations
**Sous-agent UI** : `src/components/ui/`
- Fichiers critiques : `card.tsx`, `metric.tsx`, `confirm-dialog.tsx`, `progress.tsx`, `badge.tsx`, `ptai.tsx`
- Ces composants sont importés PARTOUT. Une correction ici impacte toutes les pages.
- **Mapping prioritaire** :
  - `text-[--ct-text-strong]` → `ct-text-strong`
  - `text-[--ct-text-muted]` → `ct-text-muted`
  - `text-[--ct-text-primary]` → `ct-text-primary`
  - `bg-[--ct-surface-1/2/3]` → `ct-surface-1/2/3` ou `bg-[var(--ct-surface-*)]`
  - `border-[--ct-border-strong/soft]` → `ct-border` / `ct-border-soft` / `border-[var(--ct-border-*)]`
  - `rounded-[--ct-radius-*]` → `rounded-[var(--ct-radius-*)]` ou Tailwind natif (`rounded-full`, `rounded-lg`)
  - `shadow-[var(--ct-shadow-elevated)]` → garder `shadow-[var(...)]` (déjà propre)
  - `text-[length:var(--ct-text-micro)]` → `eyebrow`

### Phase 2 — Scenario (P1) — 154 violations
**Sous-agent Scenario** : `src/components/scenario/`
- Fichiers : `output-panel.tsx` (35), `lab-shell.tsx` (26), `output-panel-compact.tsx` (24), `backtest-panel.tsx` (19), `compare-mode.tsx` (17), `rebalancing-actions.tsx` (8)
- Même mapping que Phase 1.

### Phase 3 — Proof Center + Proof (P1) — 73 violations
**Sous-agent Proof** : `src/components/proof-center/` + `src/components/proof/`
- Fichiers : `contracts-audit-trail.tsx` (22), `event-timeline.tsx` (21), `por-summary.tsx` (11), `proof-card.tsx` (15), `proof-list.tsx` (11)

### Phase 4 — Vaults + Portfolio + Memo + Dashboard + Admin + Error + Demo (P2-P3) — 133 violations
**Sous-agent Misc** : tout le reste
- `src/components/vaults/` (31), `src/components/portfolio/` (13), `src/components/memo/` (11), `src/components/dashboard/` (19), `src/components/admin/` (53), `src/components/error/` (4), `src/components/demo/` (1)

---

## 📚 Classes utilitaires disponibles (src/app/cockpit.css)

Vérifier l'existence avant d'utiliser. Si la classe n'existe pas, utiliser `var(--ct-*)`.

```css
/* Texte */
.ct-text-muted   { color: var(--ct-text-muted); }
.ct-text-strong  { color: var(--ct-text-strong); }
.ct-text-faint   { color: var(--ct-text-faint); }
.ct-text-primary { color: var(--ct-text-primary); }
.ct-text-body    { color: var(--ct-text-body); }

/* Status */
.ct-status-success { color: var(--ct-status-success); }
.ct-status-success-bg { background: var(--ct-status-success-soft); border-color: var(--ct-status-success-border); color: var(--ct-status-success); }
.ct-status-danger { color: var(--ct-status-danger); }
.ct-status-danger-bg { background: var(--ct-status-danger-soft); border-color: var(--ct-status-danger-border); color: var(--ct-status-danger); }
.ct-status-warning { color: var(--ct-status-warning); }

/* Surfaces */
.ct-surface-1 { background: var(--ct-surface-1); }
.ct-surface-2 { background: var(--ct-surface-2); }

/* Bordures */
.ct-border { border: 1px solid var(--ct-border); }
.ct-border-soft { border: 1px solid var(--ct-border-soft); }

/* Typographie */
.eyebrow { /* ct-text-muted + uppercase + tracking */ }
.body-xs { /* taille micro */ }
.stat-value { /* text-2xl + font-semibold */ }
.stat-label { /* text-sm + muted */ }
```

---

## 🔧 Règles de transformation

| Pattern | Remplacement | Notes |
|---------|-------------|-------|
| `text-[--ct-text-muted]` | `ct-text-muted` | Classe utilitaire |
| `text-[--ct-text-strong]` | `ct-text-strong` | Classe utilitaire |
| `text-[--ct-text-primary]` | `ct-text-primary` | Classe utilitaire |
| `text-[--ct-text-faint]` | `ct-text-faint` | Classe utilitaire |
| `text-[--ct-text-body]` | `ct-text-body` | Vérifier existence |
| `bg-[--ct-surface-1]` | `ct-surface-1` ou `bg-[var(--ct-surface-1)]` | Vérifier existence |
| `bg-[--ct-surface-2]` | `ct-surface-2` ou `bg-[var(--ct-surface-2)]` | Vérifier existence |
| `border-[--ct-border]` | `ct-border` ou `border-[var(--ct-border)]` | Attention directional |
| `border-[--ct-border-soft]` | `ct-border-soft` ou `border-[var(--ct-border-soft)]` | Attention directional |
| `border-[--ct-border-strong]` | `border-[var(--ct-border-strong)]` | Pas de classe |
| `rounded-[--ct-radius-sm]` | `rounded-[var(--ct-radius-sm)]` | Ou Tailwind natif |
| `rounded-[--ct-radius-md]` | `rounded-[var(--ct-radius-md)]` | Ou Tailwind natif |
| `rounded-[--ct-radius-lg]` | `rounded-[var(--ct-radius-lg)]` | Ou Tailwind natif |
| `rounded-[--ct-radius-xl]` | `rounded-[var(--ct-radius-xl)]` | Ou Tailwind natif |
| `rounded-[--ct-radius-full]` | `rounded-full` | Tailwind natif |
| `text-[length:var(--ct-text-micro)]` | `eyebrow` | Classe typographique |
| `shadow-[var(--ct-shadow-*)]` | garder | Déjà propre |
| `z-[var(--ct-z-*)]` | garder | Déjà propre |
| `duration-[var(--ct-dur-*)]` | garder | Déjà propre |

**Règle d'or** : Si une classe `.ct-*` existe dans `cockpit.css`, l'utiliser. Sinon, passer de `--ct-*` à `var(--ct-*)`.

---

## ⚠️ Contraintes non-négociables

1. **Ne toucher à AUCUNE logique, structure, ou contenu textuel.**
2. **Ne pas casser les classes conditionnelles** (`cn()`, `clsx()`, template literals).
3. **Préserver les transitions et animations** (`transition-opacity`, `animate-pulse`, etc.).
4. **Attention aux bordures directionnelles** : `border-t`, `border-b`, `border-l`, `border-r`. Si `ct-border-soft` pose un border sur 4 côtés, utiliser `border-t-[var(--ct-border-soft)]`.
5. **Vérifier l'existence des classes** dans `cockpit.css` avant de les utiliser.
6. Après chaque phase, `npx tsc --noEmit` doit passer sans erreur.

---

## ✅ Checklist de validation globale

- [ ] Phase 1 (UI) : 0 violation dans `src/components/ui/`
- [ ] Phase 2 (Scenario) : 0 violation dans `src/components/scenario/`
- [ ] Phase 3 (Proof) : 0 violation dans `src/components/proof-center/` + `src/components/proof/`
- [ ] Phase 4 (Misc) : 0 violation dans tout le reste de `src/components/`
- [ ] `grep -rn "\[--ct-\|text-\[length" src/components/` → 0 résultat
- [ ] `npx tsc --noEmit` → passe sans erreur
- [ ] Commit final : `git add -A && git commit -m "fix(audit): migrate all src/components to design system classes"`

---

## 🚀 Instructions d'exécution

1. **Crée 4 sous-agents en parallèle** (Phase 1, 2, 3, 4).
2. Chaque sous-agent reçoit :
   - Ses fichiers exacts
   - Le mapping de transformation ci-dessus
   - Les contraintes non-négociables
3. **Attends que les 4 sous-agents terminent**.
4. **Vérifie globale** : `grep -rn "\[--ct-\|text-\[length" src/components/` → 0.
5. **TypeScript** : `npx tsc --noEmit`.
6. **Commit**.
