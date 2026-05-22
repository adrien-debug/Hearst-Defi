# Prompt Admin — Lot 1 : Dashboard + Monitoring

**Date** : 2026-05-22
**Projet** : Hearst Connect DeFi (Next.js 16 + Tailwind + TypeScript)
**Branche** : main
**Règle** : Commit après chaque lot, format `fix(audit): admin lot 1 — dashboard + monitoring`

---

## Objectif

Corriger tous les styles inline `[--ct-*]` et `text-[length:var(--ct-text-*)]` dans les pages admin **dashboard** et **monitoring** pour utiliser les classes utilitaires du design system.

## Fichiers concernés

- `src/app/admin/dashboard/page.tsx`
- `src/app/admin/monitoring/page.tsx`

## Mapping des corrections (déjà identifié)

### Dashboard (`page.tsx`) :
- L446 : `border-[--ct-border-soft]` → `ct-border-soft`
- L447 : `text-[--ct-text-muted]` → `ct-text-muted`
- L547 : `text-[length:var(--ct-text-micro)]` → `eyebrow`

### Monitoring (`page.tsx`) :
- L19 : `text-[--ct-text-muted] hover:text-[--ct-text-strong]` → `ct-text-muted hover:ct-text-strong`
- L52, L84 : `border-[--ct-border]` → `ct-border`
- L53-55, L85-90 : `text-[--ct-text-muted]` → `ct-text-muted` (6 occurrences dans les `<th>`)
- L60, L95 : `border-[--ct-border-soft]` → `ct-border-soft`
- L68, L114 : `text-[--ct-text-muted]` → `ct-text-muted`
- L107 : `text-[--ct-text-muted]` → `ct-text-muted`
- L132 : `text-[--ct-text-strong]` → `ct-text-strong`
- L148 : `rounded-[--ct-radius-full]` → `rounded-full` (Tailwind natif) ou garder `rounded-[var(--ct-radius-full)]`
- L148 : `bg-[--ct-surface-2] text-[--ct-text-muted]` → vérifier si `ct-surface-2` existe, sinon utiliser `bg-[var(--ct-surface-2)]`

## Classes utilitaires disponibles (définies dans `src/app/cockpit.css`)

```css
.ct-text-muted   { color: var(--ct-text-muted); }
.ct-text-strong  { color: var(--ct-text-strong); }
.ct-text-faint   { color: var(--ct-text-faint); }
.ct-text-primary { color: var(--ct-text-primary); }
.ct-border-soft  { border: 1px solid var(--ct-border-soft); }
.ct-divide-soft > * + * { border-top: 1px solid var(--ct-border-soft); }
.eyebrow { /* ct-text-muted + uppercase + tracking */ }
```

## Contraintes non-négociables

1. Remplacer **TOUS** les `text-[--ct-*]` par `ct-text-*`.
2. Remplacer **TOUS** les `border-[--ct-*]` par `ct-border*` ou classes équivalentes.
3. Remplacer **TOUS** les `text-[length:var(--ct-text-*)]` par les classes typographiques (`eyebrow`, `body-xs`, etc.).
4. **Ne toucher à AUCUNE logique, structure, ou contenu textuel.**
5. Après modification, `npx tsc --noEmit` doit passer sans erreur.
6. Si une classe n'existe pas dans `cockpit.css`, utiliser `var(--ct-*)` au lieu de `--ct-*` brut (ex: `bg-[var(--ct-surface-2)]` au lieu de `bg-[--ct-surface-2]`).

## Vérification finale (à exécuter)

```bash
# Doit retourner 0 résultat
grep -n "\[--ct-\|text-\[length" src/app/admin/dashboard/page.tsx src/app/admin/monitoring/page.tsx

# TypeScript doit compiler
npx tsc --noEmit
```

## Commit

```bash
git add -A
git commit -m "fix(audit): admin lot 1 — dashboard + monitoring"
```
