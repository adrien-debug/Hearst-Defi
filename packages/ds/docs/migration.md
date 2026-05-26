# Migration Guide

Adopting `@ds/core` in an existing product. The strategy: **mount tokens → wrap with theme →
migrate component by component → sunset the old DS**. Each step is independently shippable, so
you can pause between stages without leaving the product in a broken state.

This guide assumes the existing product has *some* design system — even an informal one. If your
product is greenfield, skip to step 3.

---

## Stage 1 — Mount tokens

**Goal:** make `--ds-*` available everywhere without changing a single component.

### 1.1 · Install

```bash
pnpm add @ds/core
```

### 1.2 · Import token CSS at the root

```tsx
// app/layout.tsx (Next.js) or src/main.tsx (Vite) or your equivalent
import "@ds/core/tokens.css";        // primitives + semantic
import "@ds/core/themes/light.css";  // pick a default theme
// import "@ds/core/themes/dark.css"; // load others lazily or via theme engine
```

### 1.3 · Verify the root

```html
<html data-ds-theme="light" class="ds-theme-light">
```

Add the `data-ds-theme` attribute (and matching class) on the `<html>` element. The Tailwind
preset (next stage) reads from this attribute for variant generation.

### 1.4 · Smoke test

Open DevTools, inspect `<html>`. You should see ≈300 `--ds-*` custom properties resolved. None of
your existing components have changed — tokens are merely *available* now.

**Ship Stage 1 in its own PR.** It introduces no visual diff.

---

## Stage 2 — Wrap with theme

**Goal:** route the existing design language through the DS, even if components stay unchanged.

### 2.1 · Map your old tokens to DS tokens

Create a thin shim that aliases your existing CSS vars to DS tokens. If your product used
`--brand-primary`, redirect it:

```css
/* src/styles/_shim.css — temporary */
:root {
  --brand-primary:    var(--ds-color-primary-500);
  --brand-primary-fg: var(--ds-color-text-inverse);
  --brand-bg:         var(--ds-color-bg-base);
  --brand-bg-card:    var(--ds-color-bg-raised);
  --brand-radius:     var(--ds-radius-md);
  --brand-shadow:     var(--ds-shadow-md);
}
```

Import this shim *after* `@ds/core/tokens.css`. Your existing components now read DS tokens
indirectly. Visually, the product looks closer to the DS — but the components haven't moved.

### 2.2 · Compatibility shims for utility classes

If your old DS exposed Tailwind-like utilities (`.bg-card`, `.text-muted`), keep them temporarily
but redirect them:

```css
/* src/styles/_shim-utilities.css */
.bg-card { background: var(--ds-color-bg-raised); }
.text-muted { color: var(--ds-color-text-secondary); }
.shadow-card { box-shadow: var(--ds-shadow-sm); }
```

Mark this file `/* @deprecated — remove after Stage 4 */`. Your `git grep` for these classes
becomes the migration checklist.

### 2.3 · Pick a theme

```ts
import { applyTheme } from "@ds/core/themes";
applyTheme("dark"); // or "light", "enterprise", "luxury", etc.
```

If your product already had a dark mode toggle, replace it with `applyTheme(next)`.

### 2.4 · Tailwind v4 preset (if using Tailwind)

```ts
// tailwind.config.ts  (or next.config.js for Tailwind v4 in-config)
import dsPreset from "@ds/core/tailwind/preset";

export default {
  presets: [dsPreset],
  // your own content paths
};
```

The preset wires every DS token as a utility (`ds:bg-bg-raised`, `ds:p-4`, `ds:rounded-md`,
`ds:shadow-md`, etc.) under the `ds:` namespace to avoid colliding with your existing classes.

**Ship Stage 2 in its own PR.** Diff should be small — only colors/radii drift toward DS values.

---

## Stage 3 — Migrate component by component

**Goal:** replace your local components with `@ds/core` primitives, one PR per primitive family.

### Suggested order

Migrate primitives in increasing visual complexity. Each one is bounded enough to ship
independently and roll back without affecting the others.

1. **Button** + **IconButton** — touches every page; biggest payoff first
2. **Input**, **Textarea**, **Select**, **Checkbox**, **Radio**, **Switch** — forms
3. **Badge**, **Avatar**, **Skeleton**, **Loader**, **EmptyState** — atoms
4. **Card** — surface foundation
5. **Modal**, **Drawer**, **Popover**, **Tooltip**, **Dropdown**, **Sheet**, **ContextMenu** —
   overlays
6. **Tabs**, **Breadcrumb**, **Pagination** — navigation
7. **Table**, **DataGrid** — data display
8. **Sidebar**, **Topbar** — chrome
9. **Calendar**, **DatePicker**, **Kanban**, **Timeline**, **ActivityFeed** — specialized data
10. **CommandPalette**, **AIPromptBox**, **ChatUI**, **KpiWidget**, **Chart**, **Terminal**,
    **NotificationCenter**, **SpotlightSearch**, **FileUpload** — AI/SaaS specials

### Per-component checklist

For each component you migrate:

- [ ] Find every import: `git grep -l "from '@/components/Button'"`
- [ ] Replace import path: `import { Button } from "@ds/core"`
- [ ] Map your old prop names to DS prop names (see `docs/components.md`)
- [ ] Move custom styles into `className` (merged via `cn()`)
- [ ] Delete the old component file once zero imports remain
- [ ] Update the relevant Storybook story (if any) to reference `@ds/core`
- [ ] Snapshot test passes / diff is reviewed

### Codemod helper

For the trivial cases (rename props, swap import path), the package ships a jscodeshift
transform:

```bash
pnpm dlx @ds/codemod button \
  --from "@/components/Button" \
  --map "primary:variant=primary" \
  --map "danger:variant=destructive" \
  src/
```

The codemod is best-effort — review every diff. Don't blind-merge.

### Don't migrate everything in one PR

A single PR per primitive family keeps reviews tractable and rollbacks painless. Migrating all 45
primitives in one go almost always produces a regression that nobody can locate.

---

## Stage 4 — Sunset the old DS

**Goal:** delete the shims, lock the package, prevent regressions.

### 4.1 · Remove the compatibility shims

When the last grep for old utility classes / old component imports returns zero results:

```bash
git grep -l "bg-card\|text-muted\|shadow-card"        # should be empty
git grep -l "from '@/components/(Button|Input|...)'"   # should be empty
```

Delete:

- `src/styles/_shim.css`
- `src/styles/_shim-utilities.css`
- `src/components/Button.tsx` (and every other migrated local component)

### 4.2 · Lock the package surface

Add a lint rule (`eslint-plugin-no-restricted-imports`) that **forbids** importing from
`src/components/` of your old DS:

```js
// .eslintrc
"no-restricted-imports": [
  "error",
  {
    paths: [
      { name: "@/components", message: "Use @ds/core" },
      { name: "@/styles/_shim.css", message: "Shim removed" },
    ],
  },
],
```

### 4.3 · Pin a version

```jsonc
// package.json
{
  "dependencies": {
    "@ds/core": "0.1.0"   // exact pin during early phases
  }
}
```

Bump deliberately when MINOR brings new primitives, never auto-bump on PATCH for visual safety.

### 4.4 · Adopt the audit slash commands

```bash
/ds-tokens      # no hardcoded colors, radii, sizes
/ds-spacing     # paddings/margins/gaps come from the scale
/ds-typo        # font tokens only
/ds-radius      # radius tokens only
/ds-shadows     # shadow tokens only
/ds-motion      # duration/easing tokens only
/ds-classes     # no arbitrary .ct-*/.ds-* invented locally
/ds-primitives  # no inline re-implementations
/ds-dark        # no `dark:` Tailwind modifier (theming via data-attr)
/ds-full        # runs them all
```

Wire `/ds-full` into your CI on the package + your consuming app. A migration is finished only
when the audit is green.

---

## Optional · Phased rollout via feature flag

For very large products, gate the new DS behind a feature flag during Stage 3:

```ts
// feature-flag-driven
import * as DS from "@ds/core";
import * as Legacy from "@/components";
const M = useFlag("ds-core") ? DS : Legacy;
<M.Button>…</M.Button>
```

Roll out to internal tenants first, then 1%, 10%, 100%. Roll back is a flag toggle, not a deploy.
Remove the indirection at Stage 4.

---

## Common pitfalls

### Mixing `--ct-*` and `--ds-*`

If your product also consumes Cockpit (`--ct-*`), keep them strictly separate. They are two
independent design systems with two different namespaces. Don't alias one to the other; consume
each at the surface that owns it (Cockpit shell vs DS components).

### `dark:` Tailwind modifier sneaking in

DS theming is **data-attribute driven** (`[data-ds-theme="dark"]`), not class-driven (`dark:bg-…`).
A `dark:` modifier in source is a bug that breaks the 8-theme story. The `/ds-dark` audit
enforces this.

### "Just a one-off hex"

Hardcoded hex values multiply. The first one is always "temporary". Make every new color earn a
token. If a one-off color is truly one-off, document it in `docs/decisions/` and explain why it
can't be a token.

### Density vs theme confusion

A consumer often asks for "the compact dark version of the dashboard". `compact` is
density (`data-ds-density="compact"`), `dark` is theme (`data-ds-theme="dark"`). They compose;
they are not the same axis. Don't fold one into the other.

### Skipping ADRs

Every non-trivial DS decision goes into `docs/decisions/ADR-*.md`. Migration touches enough of the
codebase that future contributors deserve to know *why* the shim was needed, *why* the migration
order was that one, *why* a specific theme was picked as the default. Skipping ADRs makes the next
migration twice as hard.

---

## Migration takes a quarter, not a sprint

A realistic migration for a product with ≈100 components consuming an informal local DS:

| Stage | Effort (engineer-weeks) |
|---|---|
| Stage 1 — mount tokens | 0.5 |
| Stage 2 — wrap with theme + shim | 1 |
| Stage 3 — migrate components | 4–8 |
| Stage 4 — sunset + lock | 0.5–1 |
| **Total** | **6–10 weeks** |

The cost is paid once; the savings (consistent design, runtime theming, white-label, accessibility
floor) accrue forever.
