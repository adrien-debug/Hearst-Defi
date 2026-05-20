# Design Lock — Hearst Connect

> **Verrou du design system.** Bloqué le 2026-05-20.
> Source de vérité visuelle : [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).
> Source de vérité code : `src/app/cockpit.css` + `node_modules/@hearst/cockpit-shell/tokens.css`.
>
> Ce document définit ce qui est **autorisé**, ce qui est **interdit**, et le
> process pour **demander** un ajout. Toute nouvelle ligne de code UI dans
> `src/app/**` ou `src/components/**` doit respecter ce verrou.

---

## 1. Règle d'or

> **Aucun nouveau token, aucune nouvelle primitive, aucune nouvelle classe utilitaire ne peut être créé sans validation explicite d'Adrien.** Si le vocabulaire ci-dessous ne suffit pas pour réaliser une feature, **stop, demander**, ne pas inventer.

Corollaire :
- **Aucun hex hardcodé** en dehors de `src/lib/cockpit-tokens.ts` (exception PDF/Privy/registry).
- **Aucun spacing en px magique** (utiliser `--ct-space-*` ou échelle Tailwind v4).
- **Aucun font hors Satoshi** (sauf `mono` qui est aussi Satoshi avec features).
- **Aucun modificateur `dark:`** — dark-only au MVP.
- **Aucun import cross-projet** depuis `Dev/hearst-connect` (CLAUDE.md non-négociable #11).

---

## 2. Vocabulaire autorisé — couleurs

### Bases (CSS vars `--ct-*`, source `cockpit.css` + tokens.css)

| Catégorie | Tokens autorisés |
|---|---|
| **Fond global** | `--ct-bg-deep` (`#1A050B`) |
| **Accent produit** | `--ct-accent` (`#8A1538`), `--ct-accent-maroon`, `--ct-accent-strong`, `--ct-accent-soft`, `--ct-border-accent` |
| **Surfaces (élévation 0→3)** | `--ct-surface-0`, `--ct-surface-1`, `--ct-surface-2`, `--ct-surface-3` |
| **Texte** | `--ct-text-strong` (#fff), `--ct-text-primary`, `--ct-text-body`, `--ct-text-muted`, `--ct-text-faint` |
| **Bordures** | `--ct-border-soft`, `--ct-border`, `--ct-border-strong` |
| **Status** | `--ct-status-success` / `-warning` / `-danger` / `-info` (+ leurs `-soft`, `-border`, `-glow`) |

### Alias Tailwind v4 (`@theme` dans `globals.css`)

Utilisables comme `bg-bg`, `bg-bg-card`, `text-text`, `border-border`, etc. Aucun nouveau `--color-*` ne s'ajoute sans validation.

### Constantes TS (pour PDF + tiers uniquement)

`src/lib/cockpit-tokens.ts` — `CT_ACCENT_HEX`, `CT_PRODUCT_CONNECT_HEX`, `CT_PDF.*`, `CT_ALLOCATION.*`. **Ne jamais utiliser ces hex dans du code CSS / Tailwind du web** : c'est uniquement pour `@react-pdf/renderer` et theme props SDK (Privy, registry CockpitShell).

---

## 3. Vocabulaire autorisé — typographie, spacing, motion

### Typo (Satoshi only)

- **Tailles** : `--ct-text-micro` / `xs` / `sm` / `base` / `lg` / `xl` / `2xl` / `3xl` / `5xl` / `display` (10 paliers, mirror Tailwind + micro 10px).
- **Poids** : `--ct-font-light` / `normal` / `medium` / `semibold` / `bold` / `extrabold` (300, 400, 500, 600, 700, 800).
- **Line height** : `--ct-leading-none` / `tight` / `snug` / `normal` / `relaxed`.
- **Tracking** : `--ct-tracking-tighter` / `tight` / `normal` / `wide` / `wider`.
- **Chiffres** : `font-variant-numeric: tabular-nums` (classe `.tabular`) **obligatoire** pour toute valeur numérique alignée.
- **Rôles** : classes `.h1` / `.h2` / `.h3` / `.h4`, `.eyebrow`, `.stat-value`, `.stat-label`, `.body-lg` / `md` / `sm` / `xs`, `.ct-section-title`.

### Spacing (rem-based)

`--ct-space-0` à `--ct-space-24` (échelle 4px = 0.25rem, mirror Tailwind v4). **Pas de px magique** — soit token Cockpit, soit utilitaire Tailwind (`p-4`, `gap-2`…).

### Radius

`--ct-radius-sm` (.375rem) / `md` (.5) / `lg` (.75) / `xl` (1) / `full` (9999px). Aliases : `--radius-card` = lg, `--radius-button` = full, `--radius-modal` = xl, `--radius-input` = md.

### Z-index

`--ct-z-base 1 · raised 10 · bottom-bar 30 · dropdown 40 · rail 50 · overlay 100 · rail-tooltip 100 · modal 1000`. **Ne pas inventer de z arbitraire.**

### Motion

`--ct-dur-fast 150ms · --ct-dur-base 220ms · --ct-dur-slow 400ms`, `--ct-ease cubic-bezier(.2,.7,.2,1)`. Alias `--transition-fast/base/slow`.

### Shadows / glows

`--ct-shadow-soft · --ct-shadow-elevated · --ct-shadow-depth · --ct-glow-subtle · --ct-glow-soft · --ct-glow-strong · --ct-glow-dot · --ct-shadow-focus-ring`.

`--ct-shadow-focus-ring` (`0 0 0 3px var(--ct-glow-soft)`) — focus-ring composite shadow utilisé sur les éléments cliquables actifs (preset buttons, sliders). Ajouté 2026-05-20 (process §7) suite à 2 usages dupliqués en arbitrary value.

---

## 4. Primitives UI figées (`src/components/ui/`)

**11 primitives autorisées**, listées ci-dessous. **Aucune nouvelle primitive ne s'ajoute sans validation explicite.**

| Fichier | Rôle | Notes |
|---|---|---|
| `card.tsx` | Carte glass — wrapper standard | `padding: 20px 24px` (figé dans cockpit.css `.ct-card`) |
| `metric.tsx` | KPI value + label + delta | Toujours combiné à `provenance-badge` |
| `badge.tsx` | Pill générique | Variantes : default, accent, status |
| `button.tsx` | Bouton — primary / secondary / ghost | Radius full, font-weight 700 pour primary |
| `progress.tsx` | Barre de progression | Linéaire — pour arc/donut voir Charts SVG §5 DESIGN_SYSTEM.md |
| `skeleton.tsx` | Squelette de chargement | Importer `SkeletonCard` — ne pas redéfinir |
| `provenance-badge.tsx` | **Obligatoire sur chaque métrique** | `live\|oracle\|attested\|estimated\|manual\|stale` |
| `apy-range.tsx` | **Obligatoire pour APY** | `low–high %` — jamais ponctuel |
| `ptai.tsx` | **Obligatoire pour simulations/rebal** | Projection → Trigger → Action → Impact |
| `toaster.tsx` + `client-toaster.tsx` | Sonner Cockpit-themed | Override dans `cockpit.css` `[data-sonner-toaster]` |

**Si tu as besoin d'un nouveau composant** : compose à partir de ces 11 primitives + helpers `.ct-*`, ne crée pas une 12e primitive sans demander.

---

## 5. Classes utilitaires `.ct-*` figées

Définies dans `cockpit.css` (extension projet) et `tokens.css` (canon package).

| Famille | Classes |
|---|---|
| **Texte** | `.ct-text-primary` / `-body` / `-muted` / `-faint` / `-strong` |
| **Surface** | `.ct-surface-0` / `-1` / `-2` / `-3` + `.ct-hover-surface` |
| **Bordure** | `.ct-border-soft` / `-base` / `-strong` + `.ct-divide-soft` / `-base` |
| **Status** | `.ct-status-success/warning/danger/info` + `-bg` + `-dot-*` + `-glow-*` |
| **Typo rôles** | `.h1` / `.h2` / `.h3` / `.h4`, `.eyebrow`, `.stat-value`, `.stat-label`, `.body-lg/md/sm/xs`, `.ct-section-title` |
| **Composants** | `.ct-pill` (+ `.accent`), `.ct-input`, `.ct-select`, `.ct-textarea` |
| **Layout shell** | `.ct-root`, `.ct-rail-left/right`, `.ct-page-area`, `.ct-panels-row`, `.ct-ambient-deep/glow` |
| **Layout intra-app** | `.ct-section`, `.ct-rail-intra`, `.ct-rail-item` (+ `-active`, `-tooltip`) |
| **Heritage** | `.glass-panel`, `.glass-panel-subtle` (aliases vers tokens Cockpit) |
| **Bottom bar** | `.ct-bottom-bar` / `-inner`, `.ct-seg-track`, `.ct-seg-btn` (+ `.active`, `.primary`) |
| **Cards/KPI** | `.ct-card`, `.ct-kpi-card` |
| **Prose** | `.prose-spec` (markdown render, 72ch max) |

---

## 6. Layout — invariants

- **Shell** : rail gauche `--ct-rail-left 88px` (fixe) + zone centrale `.ct-page-area` + rail droit `--ct-rail-right 420px` (chat Kimi, **rail unique**).
- **Halo central** : `radial-gradient(ellipse 80% 70% at 50% 45%, accent-maroon 45%+deep → deep 72%)` — appliqué sur `.ct-page-area`.
- **Bento dashboard** : grille 12 col, gaps `1px` sur `--ct-border-soft`, cellules `--ct-bg-deep`, `border-radius: var(--ct-radius-lg)`.
- **Chat IA produit** : **interdit** ailleurs que le rail droit (CLAUDE.md non-négociable #4).

---

## 7. Process — comment demander un ajout

Si tu (Claude ou humain) penses avoir besoin d'un token, d'une primitive, d'une classe, d'une font, d'une couleur, ou d'une dépendance UI **qui n'est pas dans ce document** :

1. **Stop l'implémentation.**
2. Rédige un message à Adrien décrivant :
   - **Quoi** : le nom proposé (token / primitive / classe).
   - **Pourquoi** : la feature qui le motive (avec le chemin du fichier appelant).
   - **Pourquoi ce n'est pas faisable avec le vocabulaire actuel** : ce que tu as essayé.
   - **Alternative envisagée** : composition à partir de l'existant qui *pourrait* marcher.
3. Attends sa validation.
4. Si validé, l'ajout se fait :
   - **Token** → ajouté dans `cockpit.css` (extension projet) + ajouté à ce document § correspondant.
   - **Primitive** → ajoutée dans `src/components/ui/` + ajoutée à la table §4 + mention dans `DESIGN_SYSTEM.md`.
   - **Classe** → ajoutée dans `cockpit.css` + table §5.
5. Si refusé, recompose à partir de l'existant ou abandonne la feature.

---

## 8. Comment vérifier (lint manuel / future CI)

Audit rapide d'un fichier UI :

```bash
# Hex hardcodés (hors src/lib/cockpit-tokens.ts) :
rg -n '#[0-9a-fA-F]{3,8}\b' src/app src/components | grep -v cockpit-tokens
# Devrait être vide.

# px magiques (hors borders/transitions) :
rg -n '\b[0-9]+px\b' src/app src/components | grep -vE '(border|transition|animation|outline)'
# À auditer ligne par ligne.

# Imports cross-projet (CLAUDE.md #11) :
rg -n 'hearst-connect/' src/
# Devrait être vide.

# dark: modifiers (interdit) :
rg -n '\bdark:' src/
# Devrait être vide.
```

---

## 9. Lien avec les autres règles

- **CLAUDE.md** : non-négociables #1 (APY range), #2 (provenance), #3 (PTAI), #4 (no chat IA), #5 (forbidden words), #10 (assumptions + not-guaranteed disclaimer), **#11 (no cross-project import)**.
- **DESIGN_SYSTEM.md** : description visuelle + charts SVG convention (§5 — règle dasharray = `${arc} ${C-arc}`).
- **Mémoire persistante** : `feedback_no_cross_project_imports.md` (verrou cross-projet — appliqué globalement).
