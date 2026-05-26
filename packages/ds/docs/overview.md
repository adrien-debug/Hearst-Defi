# @ds/core — Overview

## Vision

`@ds/core` is a **portable, token-driven, white-label design system**. It targets the same engineering bar
as Stripe, Linear, Vercel and Apple while staying agnostic of any single product. The package ships
primitives, themes, motion, and runtime overrides — not opinions about what a product looks like.

It is consumed by Hearst Connect today, and is structured so any other product (internal or external)
can drop it in and rebrand within an afternoon.

## Philosophy

Five non-negotiables shape every decision in this package:

1. **Tokens are the source of truth.** Every color, spacing unit, radius, shadow, motion timing and
   z-index lives in `src/tokens/`. Components reference tokens through `var(--ds-*)` only. A hardcoded
   `#A7FB90` or `padding: 16px` in a component is a bug.
2. **Primitive → Semantic → Component → Theme cascade.** Lower layers know nothing about higher ones.
   A theme can replace a semantic token; a semantic token can replace a component default; a primitive
   never knows it has been overridden.
3. **Runtime brand override.** A tenant overrides primary color, font, radius or motion via a single
   `applyBrand({...})` call — no rebuild, no fork, no class explosion.
4. **AAA where feasible, AA always.** Contrast, focus rings, keyboard nav, screen-reader semantics,
   reduced-motion, touch targets and forced-colors mode are checked, not aspirational.
5. **Tree-shakable.** Every primitive is a named export with no side effect besides the global
   `tokens.css` and active `themes/<id>.css`. Apps pay for what they import.

## Comparison with reference systems

| System | Strength we borrow | Difference |
|---|---|---|
| **Stripe Elements / Stripe DS** | Density tiers, financial primitives, restraint in motion | We expose density as a public token (`--ds-density`), they keep it private |
| **Linear** | Keyboard-first interactions, command palette as first-class, motion micro-detail | We package the command palette as a primitive (`src/primitives/command-palette/`), they keep it bespoke |
| **Vercel Geist** | Token cascade clarity, monochrome restraint, type ramp | We add 7 alternative themes on top of the monochrome baseline |
| **Apple HIG** | Spacing rhythm, glass material, focus & a11y rigor | We treat glass as a theme (`ds-theme-glass`), not a default surface |
| **Radix UI** | Headless behavior, ARIA correctness, polymorphic `asChild` | We re-export Radix for behavior and add token-driven styling on top |
| **shadcn/ui** | Copy-paste ergonomics, sensible defaults | We ship as a published package, not a copy-paste recipe — versioning matters at scale |

## Architecture — the 4 layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                    LAYER 4 · THEME                                   │
│  src/themes/{light,dark,amoled,luxury,glass,enterprise,neon,mono}.css│
│  Overrides ONLY semantic + component tokens. Toggled via class       │
│  `.ds-theme-<id>` or `data-ds-theme="<id>"`.                         │
├──────────────────────────────────────────────────────────────────────┤
│                    LAYER 3 · COMPONENT                               │
│  src/primitives/<name>/<name>.tsx                                    │
│  Reads --ds-color-text-primary, never --ds-color-neutral-900.        │
│  Variants composed via tailwind-variants on token-backed classes.    │
├──────────────────────────────────────────────────────────────────────┤
│                    LAYER 2 · SEMANTIC                                │
│  src/tokens/semantic.css                                             │
│  --ds-color-text-primary, --ds-color-surface-elevated,               │
│  --ds-color-border-subtle, --ds-color-focus-ring …                   │
│  Each semantic var resolves to a primitive var.                      │
├──────────────────────────────────────────────────────────────────────┤
│                    LAYER 1 · PRIMITIVE                               │
│  src/tokens/primitive.css                                            │
│  --ds-color-neutral-{50..950}, --ds-color-blue-500, …                │
│  Raw oklch() values. No alias, no meaning.                           │
└──────────────────────────────────────────────────────────────────────┘
```

### Cascade — concrete example

```
Layer 1 (primitive.css)
  --ds-color-neutral-900: oklch(15% 0.01 240);
       │
       ▼
Layer 2 (semantic.css)
  --ds-color-text-primary: var(--ds-color-neutral-900);
       │
       ▼
Layer 4 (themes/luxury.css overrides Layer 2)
  .ds-theme-luxury {
    --ds-color-text-primary: var(--ds-color-warm-100);
  }
       │
       ▼
Layer 3 (Button.tsx) — unchanged
  color: var(--ds-color-text-primary);
```

The button never branches on theme. The theme replaced one var; the cascade did the rest.

## What is in the box

```
packages/ds/
├── src/
│   ├── tokens/             # primitive.css, semantic.css, components.css
│   ├── themes/             # 8 .css files + theme-engine.ts + white-label.ts
│   ├── motion/             # transition tokens + reduced-motion shim
│   ├── primitives/         # 40+ React components
│   ├── utils/              # cn(), cva-like helpers, polymorphic types
│   ├── tailwind/           # preset.ts for Tailwind v4 consumers
│   └── index.ts            # public surface
├── examples/               # dashboard.tsx, ai-saas-dashboard.tsx, landing.tsx
├── docs/                   # this directory
├── tokens.figma.json       # W3C Design Tokens, with 8 modes
├── CHANGELOG.md
├── CONTRACT.md             # build contract — read by every agent
└── README.md               # quick-start
```

## Public surface

```ts
// Components
import { Button, Card, Modal, Table, CommandPalette /* … */ } from "@ds/core";

// Tokens (raw, for one-off styling escape hatches)
import "@ds/core/tokens.css";

// Theme switching
import { applyTheme, getTheme } from "@ds/core/themes";
applyTheme("luxury");

// White-label runtime
import { applyBrand, serializeBrand, parseBrand } from "@ds/core/white-label";
applyBrand({ colors: { primary: "oklch(70% 0.2 25)" } });

// Tailwind preset (for consumers using Tailwind v4)
import dsPreset from "@ds/core/tailwind/preset";
```

## When to reach for what

| Need | Reach for |
|---|---|
| Build a UI in a new product | `import { … } from "@ds/core"` + apply default theme |
| Rebrand a tenant | `applyBrand({...})` at boot |
| Switch dark/light | `applyTheme("dark")` |
| Custom utility class for one feature | Local CSS using `var(--ds-*)` — never raw values |
| New token needed | Add to `src/tokens/`, document in `docs/tokens.md`, mirror in `tokens.figma.json` |
| New primitive needed | Open an ADR, then scaffold under `src/primitives/<name>/` per CONTRACT.md §4 |

## Non-goals

- **Not a CSS-in-JS runtime.** Styling is plain CSS variables + Tailwind utilities. No emotion, no
  styled-components, no Stitches.
- **Not a full app framework.** We ship primitives, not opinions about routing, data fetching, or
  state management.
- **Not Cockpit.** Cockpit is a separate, product-specific DS for Hearst Connect's bordeaux shell.
  `@ds/core` namespaces are `--ds-*`; Cockpit is `--ct-*`. They can coexist in the same app but never
  share tokens.
- **Not a copy-paste library.** Components are imported from the published package and consumed via
  versioned releases. Forking the source defeats the cascade.

## Versioning

Semantic versioning, strict.

- **MAJOR**: token rename, primitive removed, breaking API change in `applyBrand` / `applyTheme`.
- **MINOR**: new primitive, new theme, new token category, new variant.
- **PATCH**: bug fix, token value tweak (only if visual delta is sub-perceptual), doc update.

A changed token *value* that is visually perceptible is treated as MINOR, not PATCH.

## Source of truth

When the docs and the code diverge, the code wins for the current version, the docs win for what the
next version must enforce. File an ADR in `docs/decisions/` if you need to change a non-negotiable
above.

## Read next

- `docs/tokens.md` — full token reference
- `docs/themes.md` — the 8 themes
- `docs/components.md` — primitive catalog
- `docs/style-guide.md` — composition guidelines
- `docs/white-label.md` — multi-tenant brand override
- `docs/a11y.md` — accessibility floor
- `docs/migration.md` — adopting `@ds/core` in an existing product
- `CONTRACT.md` — non-negotiable build contract for contributors
