# Prompt Méga — Orchestrateur Claude Opus (Lots 5+6+7)

**Date** : 2026-05-22
**Projet** : Hearst Connect DeFi (Next.js 16 + Tailwind + TypeScript)
**Branche** : main
**Règle** : Commit après chaque sous-lot, format `fix(audit): admin lot N — description`

---

## 🎯 Objectif global

Corriger les **23 violations restantes** de styles inline `[--ct-*]` et `text-[length:var(--ct-text-*)]` dans les pages admin restantes (Lots 5, 6, 7).

Tu es **Orchestrateur**. Tu ne modifies pas le code toi-même. Tu délegues à des sous-agents spécialisés via l'outil `Agent`.

---

## 📋 Détail des 23 violations par sous-lot

### Sous-lot A — Proof Center + Proofs + Signals (3 violations)
**Fichier** : `src/app/admin/proof-center/page.tsx`
- L103 : `rounded-[--ct-radius-lg] border border-[--ct-border-soft] bg-[--ct-surface-1]` → `rounded-[var(--ct-radius-lg)] ct-border-soft ct-surface-1`
- L106 : `text-[--ct-text-strong]` → `ct-text-strong`
- L130 : `border-[--ct-border-soft]` → `ct-border-soft`

**Note** : `proofs/page.tsx` et `signals/page.tsx` sont déjà clean (0 violations).

### Sous-lot B — Investor Memo + Roadmap (6 violations)
**Fichiers** : `src/app/admin/investor-memo/page.tsx`, `src/app/admin/roadmap/page.tsx`

`investor-memo/page.tsx` :
- L22 : `border-[--ct-border-soft]` → `ct-border-soft`

`roadmap/page.tsx` :
- L29 : `text-[--ct-text-primary]` → `ct-text-primary`
- L39 : `text-[--ct-text-primary]` → `ct-text-primary`
- L52 : `border-[--ct-border-soft]` → `ct-border-soft`
- L54 : `text-[--ct-text-muted]` → `ct-text-muted`
- L65 : `text-[--ct-text-muted]` → `ct-text-muted`

**Note** : `feedback/page.tsx` est déjà clean (0 violations).

### Sous-lot C — Spec + Error + NotFound (14 violations)
**Fichiers** : `src/app/admin/spec/page.tsx`, `src/app/admin/spec/[slug]/page.tsx`, `src/app/admin/spec/[slug]/loading.tsx`, `src/app/admin/error.tsx`, `src/app/admin/not-found.tsx`

`spec/page.tsx` :
- L12 : `text-[--ct-text-body]` → `ct-text-body` (vérifier si classe existe, sinon `text-[var(--ct-text-body)]`)

`spec/[slug]/page.tsx` :
- L40 : `rounded-[--ct-radius-lg]` → `rounded-[var(--ct-radius-lg)]`
- L42 : `text-[--ct-text-primary]` → `ct-text-primary`
- L43 : `text-[--ct-text-muted]` → `ct-text-muted`
- L46 : `text-[--ct-text-faint]` → `ct-text-faint`

`spec/[slug]/loading.tsx` (7 violations — skeleton loaders) :
- L7,12,13,14,15,16,17 : `bg-[--ct-surface-1]` → `bg-[var(--ct-surface-1)]`

`error.tsx` :
- L38 : `rounded-[--ct-radius-full]` → `rounded-full`

`not-found.tsx` :
- L15 : `rounded-[--ct-radius-full]` → `rounded-full`

---

## 🤖 Instructions d'orchestration

1. **Crée 3 sous-agents en parallèle** (un par sous-lot A/B/C).
2. Chaque sous-agent reçoit :
   - La liste exacte des fichiers à modifier
   - Les lignes exactes à changer (mapping ci-dessus)
   - Les classes utilitaires disponibles dans `src/app/cockpit.css`
   - La contrainte : ne toucher à AUCUNE logique, structure, ou contenu textuel
3. **Attends que les 3 sous-agents terminent**.
4. **Vérifie** : `grep -rn "\[--ct-\|text-\[length" src/app/admin/` doit retourner 0 résultat.
5. **Vérifie** : `npx tsc --noEmit` doit passer sans erreur.
6. **Commit** : `git add -A && git commit -m "fix(audit): admin lots 5-6-7 — proof-center, roadmap, spec, error, not-found"`

---

## 📚 Classes utilitaires disponibles (src/app/cockpit.css)

```css
.ct-text-muted   { color: var(--ct-text-muted); }
.ct-text-strong  { color: var(--ct-text-strong); }
.ct-text-faint   { color: var(--ct-text-faint); }
.ct-text-primary { color: var(--ct-text-primary); }
.ct-text-body    { color: var(--ct-text-body); }     /* vérifier existence */
.ct-border-soft  { border: 1px solid var(--ct-border-soft); }
.ct-surface-1    { background: var(--ct-surface-1); } /* vérifier existence */
.ct-surface-2    { background: var(--ct-surface-2); }
.eyebrow { /* ct-text-muted + uppercase + tracking */ }
```

**Règle de fallback** : Si une classe n'existe pas dans `cockpit.css`, utiliser `var(--ct-*)` au lieu de `--ct-*` brut (ex: `bg-[var(--ct-surface-1)]` au lieu de `bg-[--ct-surface-1]`).

---

## ✅ Checklist de validation finale

- [ ] Sous-lot A : 0 violation dans `proof-center/page.tsx`
- [ ] Sous-lot B : 0 violation dans `investor-memo/page.tsx` + `roadmap/page.tsx`
- [ ] Sous-lot C : 0 violation dans `spec/*` + `error.tsx` + `not-found.tsx`
- [ ] `npx tsc --noEmit` passe sans erreur
- [ ] Commit poussé sur `main`
