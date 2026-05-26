# Tokens Reference

All tokens live in `packages/ds/src/tokens/`:

- `primitive.css` — raw values (Layer 1)
- `semantic.css` — aliases (Layer 2)
- `components.css` — component-scoped tokens (Layer 3 defaults)

Every name follows `--ds-<category>-<name>[-<variant>]`. See `CONTRACT.md §1`.

---

## 1 · Color

### 1.1 · Primitive palette

Primitives are perceptually-uniform oklch ramps. Each scale runs `50` (lightest) to `950` (darkest).
The number is **perceptual lightness × 10**, not a step index.

| Token | Value | Use |
|---|---|---|
| `--ds-color-neutral-50` | `oklch(98% 0 0)` | Backgrounds in light theme |
| `--ds-color-neutral-100` | `oklch(96% 0 0)` | Subtle surfaces |
| `--ds-color-neutral-200` | `oklch(92% 0 0)` | Borders default |
| `--ds-color-neutral-300` | `oklch(85% 0 0)` | Borders strong |
| `--ds-color-neutral-400` | `oklch(70% 0 0)` | Placeholder text |
| `--ds-color-neutral-500` | `oklch(55% 0 0)` | Disabled, dim icons |
| `--ds-color-neutral-600` | `oklch(45% 0 0)` | Secondary text light theme |
| `--ds-color-neutral-700` | `oklch(35% 0 0)` | Body text mid |
| `--ds-color-neutral-800` | `oklch(25% 0.005 240)` | Surfaces dark theme |
| `--ds-color-neutral-900` | `oklch(15% 0.005 240)` | Background dark |
| `--ds-color-neutral-950` | `oklch(8% 0.01 240)` | AMOLED-friendly background |

Same shape applies to chromatic ramps below. Each ramp ships 11 stops (`50..950`).

| Ramp | Hue (oklch h) | Anchor (500) | Primary use |
|---|---|---|---|
| `--ds-color-blue-*` | `240` | `oklch(60% 0.18 240)` | Enterprise primary, info status |
| `--ds-color-indigo-*` | `265` | `oklch(58% 0.20 265)` | AI/SaaS primary |
| `--ds-color-violet-*` | `290` | `oklch(58% 0.22 290)` | Accent in neon theme |
| `--ds-color-magenta-*` | `330` | `oklch(60% 0.24 330)` | Neon theme primary |
| `--ds-color-red-*` | `25` | `oklch(58% 0.22 25)` | Destructive, error status |
| `--ds-color-orange-*` | `55` | `oklch(70% 0.18 55)` | Warning status |
| `--ds-color-amber-*` | `85` | `oklch(78% 0.16 85)` | Highlight, gold-ish in luxury |
| `--ds-color-yellow-*` | `100` | `oklch(85% 0.17 100)` | Caution badge |
| `--ds-color-lime-*` | `130` | `oklch(80% 0.20 130)` | Fresh accent |
| `--ds-color-green-*` | `150` | `oklch(60% 0.18 150)` | Success status, primary in mint |
| `--ds-color-emerald-*` | `160` | `oklch(60% 0.16 160)` | Hearst accent ramp (#A7FB90 fit) |
| `--ds-color-teal-*` | `190` | `oklch(60% 0.14 190)` | Secondary info |
| `--ds-color-cyan-*` | `210` | `oklch(70% 0.16 210)` | Neon theme secondary |

Total: 14 ramps × 11 stops = **154 primitive color tokens**. Stored in `src/tokens/primitive.css`.

### 1.2 · Semantic surface

These resolve to a primitive in the active theme.

| Token | Light default | Dark default | Use |
|---|---|---|---|
| `--ds-color-bg-base` | `--ds-color-neutral-50` | `--ds-color-neutral-950` | Body / window background |
| `--ds-color-bg-raised` | `--ds-color-neutral-100` | `--ds-color-neutral-900` | Card resting surface |
| `--ds-color-bg-overlay` | `--ds-color-neutral-50` | `--ds-color-neutral-800` | Modal / popover surface |
| `--ds-color-bg-sunken` | `--ds-color-neutral-100` | `--ds-color-neutral-950` | Inputs, code blocks |
| `--ds-color-bg-inverse` | `--ds-color-neutral-900` | `--ds-color-neutral-50` | Inverse callouts |

```css
.card {
  background: var(--ds-color-bg-raised);
  color: var(--ds-color-text-primary);
}
```

### 1.3 · Semantic text

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ds-color-text-primary` | `neutral-900` | `neutral-50` | Body text, headings |
| `--ds-color-text-secondary` | `neutral-700` | `neutral-300` | Captions, subdued labels |
| `--ds-color-text-tertiary` | `neutral-500` | `neutral-500` | Helper text, footnotes |
| `--ds-color-text-disabled` | `neutral-400` | `neutral-600` | Disabled controls |
| `--ds-color-text-inverse` | `neutral-50` | `neutral-900` | On inverse surfaces |
| `--ds-color-text-link` | `blue-600` | `blue-400` | Hyperlinks |
| `--ds-color-text-link-hover` | `blue-700` | `blue-300` | Hover state |
| `--ds-color-text-placeholder` | `neutral-400` | `neutral-500` | Input placeholders |

### 1.4 · Semantic border

| Token | Light | Dark | Use |
|---|---|---|---|
| `--ds-color-border-subtle` | `neutral-200` | `neutral-800` | Dividers, hairlines |
| `--ds-color-border-default` | `neutral-300` | `neutral-700` | Cards, inputs |
| `--ds-color-border-strong` | `neutral-400` | `neutral-600` | Focused inputs |
| `--ds-color-border-inverse` | `neutral-900` | `neutral-50` | On inverse surfaces |

### 1.5 · Status

Status pairs come as `{status}-bg`, `{status}-fg`, `{status}-border` so a badge can paint a full triplet.

| Status | bg (subtle) | fg | border | Used by |
|---|---|---|---|---|
| `--ds-color-status-success-*` | `green-100` | `green-700` | `green-300` | `<Badge variant="success">`, toast success |
| `--ds-color-status-warning-*` | `orange-100` | `orange-700` | `orange-300` | `<Badge variant="warning">` |
| `--ds-color-status-error-*` | `red-100` | `red-700` | `red-300` | Destructive states, error toast |
| `--ds-color-status-info-*` | `blue-100` | `blue-700` | `blue-300` | Informational toasts, USDC tag |
| `--ds-color-status-neutral-*` | `neutral-100` | `neutral-700` | `neutral-300` | Default badge |

### 1.6 · Brand / accent

These are the **only** tokens a tenant typically overrides via `applyBrand`.

| Token | Default | Use |
|---|---|---|
| `--ds-color-primary-50..950` | indigo ramp | Primary buttons, links, focus ring base |
| `--ds-color-secondary-50..950` | teal ramp | Secondary buttons, tag accents |
| `--ds-color-accent-50..950` | emerald ramp | Highlights, sparkles, hero accent |
| `--ds-color-focus-ring` | `var(--ds-color-primary-500)` at 60% opacity | `:focus-visible` ring |
| `--ds-color-selection-bg` | `var(--ds-color-primary-200)` | Text selection background |
| `--ds-color-selection-fg` | `var(--ds-color-primary-900)` | Text selection foreground |

```css
button.primary {
  background: var(--ds-color-primary-500);
  color: var(--ds-color-text-inverse);
}
button.primary:hover { background: var(--ds-color-primary-600); }
button.primary:active { background: var(--ds-color-primary-700); }
button.primary:focus-visible { outline-color: var(--ds-color-focus-ring); }
```

---

## 2 · Typography

### 2.1 · Font families

| Token | Stack | Use |
|---|---|---|
| `--ds-font-sans` | `Inter, system-ui, sans-serif` | UI text default |
| `--ds-font-serif` | `"Source Serif", Georgia, serif` | Long-form, editorial themes |
| `--ds-font-mono` | `"JetBrains Mono", ui-monospace, monospace` | Code, terminal, KPIs |
| `--ds-font-display` | `var(--ds-font-sans)` | Hero / display — overridable per theme |

### 2.2 · Font sizes

Modular scale, ratio ≈ 1.125 (minor third), anchored at 16px body.

| Token | Value (px) | Computed | Use |
|---|---|---|---|
| `--ds-font-size-xs` | 12 | 0.75rem | Caption, helper text |
| `--ds-font-size-sm` | 14 | 0.875rem | Body small, table cell |
| `--ds-font-size-body-md` | 16 | 1rem | Body default |
| `--ds-font-size-body-lg` | 18 | 1.125rem | Lead paragraph |
| `--ds-font-size-h6` | 18 | 1.125rem | H6 |
| `--ds-font-size-h5` | 20 | 1.25rem | H5 |
| `--ds-font-size-h4` | 24 | 1.5rem | H4 |
| `--ds-font-size-h3` | 30 | 1.875rem | H3 |
| `--ds-font-size-h2` | 36 | 2.25rem | H2 |
| `--ds-font-size-h1` | 48 | 3rem | H1 |
| `--ds-font-size-display-sm` | 60 | 3.75rem | Hero display small |
| `--ds-font-size-display-md` | 72 | 4.5rem | Hero display medium |
| `--ds-font-size-display-lg` | 96 | 6rem | Hero display large |

### 2.3 · Font weights

| Token | Value | Use |
|---|---|---|
| `--ds-font-weight-regular` | 400 | Body text |
| `--ds-font-weight-medium` | 500 | UI controls, KPI value |
| `--ds-font-weight-semibold` | 600 | Headings H4–H6, table headers |
| `--ds-font-weight-bold` | 700 | H1–H3, emphasis |

### 2.4 · Line height & tracking

| Token | Value | Use |
|---|---|---|
| `--ds-line-height-tight` | 1.1 | Headings, display |
| `--ds-line-height-snug` | 1.3 | Sub-heads, KPI label |
| `--ds-line-height-normal` | 1.5 | Body text |
| `--ds-line-height-relaxed` | 1.7 | Long-form prose |
| `--ds-letter-spacing-tight` | -0.02em | Display |
| `--ds-letter-spacing-normal` | 0 | Body |
| `--ds-letter-spacing-wide` | 0.02em | Uppercase eyebrows |
| `--ds-letter-spacing-widest` | 0.08em | Caps small buttons |

Total typography tokens: **24** (4 families + 13 sizes + 4 weights + 4 line heights + 4 tracking).

```css
.h1 {
  font-family: var(--ds-font-display);
  font-size: var(--ds-font-size-h1);
  font-weight: var(--ds-font-weight-bold);
  line-height: var(--ds-line-height-tight);
  letter-spacing: var(--ds-letter-spacing-tight);
}
```

---

## 3 · Spacing

Single source: a **4px-anchored modular scale**. Each token is a multiple of `0.25rem`.

| Token | rem | px | Use |
|---|---|---|---|
| `--ds-spacing-0` | 0 | 0 | Reset |
| `--ds-spacing-px` | 1px | 1 | Hairline |
| `--ds-spacing-0-5` | 0.125rem | 2 | Sub-icon gap |
| `--ds-spacing-1` | 0.25rem | 4 | Tight cluster |
| `--ds-spacing-1-5` | 0.375rem | 6 | Tag inner padding |
| `--ds-spacing-2` | 0.5rem | 8 | Button inner X, gap small |
| `--ds-spacing-2-5` | 0.625rem | 10 | — |
| `--ds-spacing-3` | 0.75rem | 12 | Card inner small |
| `--ds-spacing-4` | 1rem | 16 | **Default gap** |
| `--ds-spacing-5` | 1.25rem | 20 | — |
| `--ds-spacing-6` | 1.5rem | 24 | Card padding default |
| `--ds-spacing-7` | 1.75rem | 28 | — |
| `--ds-spacing-8` | 2rem | 32 | Section gap default |
| `--ds-spacing-9` | 2.25rem | 36 | — |
| `--ds-spacing-10` | 2.5rem | 40 | Comfortable button height |
| `--ds-spacing-11` | 2.75rem | 44 | **Touch target floor** |
| `--ds-spacing-12` | 3rem | 48 | Topbar height |
| `--ds-spacing-14` | 3.5rem | 56 | — |
| `--ds-spacing-16` | 4rem | 64 | Section vertical |
| `--ds-spacing-20` | 5rem | 80 | Hero margin |
| `--ds-spacing-24` | 6rem | 96 | Page vertical rhythm |
| `--ds-spacing-32` | 8rem | 128 | Landing hero |
| `--ds-spacing-40` | 10rem | 160 | — |
| `--ds-spacing-48` | 12rem | 192 | — |
| `--ds-spacing-56` | 14rem | 224 | — |
| `--ds-spacing-64` | 16rem | 256 | Sidebar wide |
| `--ds-spacing-72` | 18rem | 288 | — |
| `--ds-spacing-80` | 20rem | 320 | — |
| `--ds-spacing-96` | 24rem | 384 | Hero asset slot |

Total: **30 spacing tokens**.

### Density modifier

A consumer can multiply the scale via `--ds-density`:

| Density | `--ds-density` | Effect |
|---|---|---|
| `compact` | `0.875` | All paddings × 0.875 — packs data dashboards |
| `comfortable` | `1` | Default |
| `spacious` | `1.125` | Marketing surfaces, accessibility preference |

```css
:root { --ds-density: 1; }
.compact { --ds-density: 0.875; }
.card { padding: calc(var(--ds-spacing-6) * var(--ds-density)); }
```

---

## 4 · Radius

| Token | Value | Use |
|---|---|---|
| `--ds-radius-none` | 0 | Inputs in `enterprise` theme |
| `--ds-radius-xs` | 2px | Tag inside table |
| `--ds-radius-sm` | 4px | Small buttons, inputs (enterprise) |
| `--ds-radius-md` | 6px | **Default** — buttons, inputs |
| `--ds-radius-lg` | 8px | Cards, dropdowns |
| `--ds-radius-xl` | 12px | Modals, large cards |
| `--ds-radius-2xl` | 16px | Hero blocks |
| `--ds-radius-3xl` | 24px | Soft surfaces (luxury, glass) |
| `--ds-radius-pill` | 9999px | Pills, switch, avatar |
| `--ds-radius-circle` | 50% | Circular avatar, dots |

Total: **10 radius tokens**.

---

## 5 · Shadow

Shadows are paired (`fg` umbra + `bg` penumbra) for a more natural elevation.

| Token | Value | Use |
|---|---|---|
| `--ds-shadow-none` | `none` | Flat surface |
| `--ds-shadow-xs` | `0 1px 2px 0 oklch(0% 0 0 / 0.05)` | Subtle |
| `--ds-shadow-sm` | `0 1px 3px 0 oklch(0% 0 0 / 0.08), 0 1px 2px -1px oklch(0% 0 0 / 0.06)` | Hairline elevation |
| `--ds-shadow-md` | `0 4px 6px -1px oklch(0% 0 0 / 0.08), 0 2px 4px -2px oklch(0% 0 0 / 0.06)` | Dropdown |
| `--ds-shadow-lg` | `0 10px 15px -3px oklch(0% 0 0 / 0.08), 0 4px 6px -4px oklch(0% 0 0 / 0.06)` | Popover, tooltip large |
| `--ds-shadow-xl` | `0 20px 25px -5px oklch(0% 0 0 / 0.10), 0 8px 10px -6px oklch(0% 0 0 / 0.05)` | Modal |
| `--ds-shadow-2xl` | `0 25px 50px -12px oklch(0% 0 0 / 0.25)` | Spotlight, command palette |
| `--ds-shadow-inner` | `inset 0 2px 4px 0 oklch(0% 0 0 / 0.05)` | Pressed input |
| `--ds-shadow-focus` | `0 0 0 3px var(--ds-color-focus-ring)` | Focus ring |
| `--ds-shadow-glow-accent` | `0 0 24px -4px var(--ds-color-accent-500)` | Accent halo (neon, AI surfaces) |

Total: **10 shadow tokens**.

---

## 6 · Motion

### 6.1 · Duration

| Token | Value | Use |
|---|---|---|
| `--ds-motion-duration-instant` | `0ms` | Reduced-motion fallback |
| `--ds-motion-duration-fast` | `120ms` | Hover, focus ring |
| `--ds-motion-duration-base` | `200ms` | **Default** — button, input |
| `--ds-motion-duration-moderate` | `320ms` | Modal enter, drawer |
| `--ds-motion-duration-slow` | `480ms` | Page transition |
| `--ds-motion-duration-deliberate` | `720ms` | Onboarding hero |

### 6.2 · Easing

| Token | Value | Use |
|---|---|---|
| `--ds-motion-ease-linear` | `linear` | Progress bar |
| `--ds-motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default UI |
| `--ds-motion-ease-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Enter / spring |
| `--ds-motion-ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Item entering |
| `--ds-motion-ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Item leaving |

### 6.3 · Transition shortcuts

| Token | Composed value | Use |
|---|---|---|
| `--ds-motion-transition-base` | `all var(--ds-motion-duration-base) var(--ds-motion-ease-standard)` | Hover/active |
| `--ds-motion-transition-color` | `color, background-color, border-color var(--ds-motion-duration-fast) var(--ds-motion-ease-standard)` | Theme switch |
| `--ds-motion-transition-opacity` | `opacity var(--ds-motion-duration-base) var(--ds-motion-ease-standard)` | Fade |
| `--ds-motion-transition-transform` | `transform var(--ds-motion-duration-base) var(--ds-motion-ease-emphasized)` | Modal enter |

Total: **15 motion tokens** (6 durations + 5 easings + 4 shortcuts).

`@media (prefers-reduced-motion: reduce)` overrides all duration tokens to `1ms` via
`src/motion/reduced.css` — see `docs/a11y.md`.

```css
.button {
  transition: var(--ds-motion-transition-base);
}
.button:hover {
  background: var(--ds-color-primary-600);
}
```

---

## 7 · Z-index

A small, intentional scale. Never inline a number — pick a layer.

| Token | Value | Use |
|---|---|---|
| `--ds-z-base` | 0 | Document flow |
| `--ds-z-raised` | 10 | Sticky table headers |
| `--ds-z-dropdown` | 100 | Dropdown menus |
| `--ds-z-sticky` | 200 | Sticky topbar |
| `--ds-z-overlay` | 300 | Backdrop |
| `--ds-z-modal` | 400 | Modal, drawer |
| `--ds-z-popover` | 500 | Popover above modal |
| `--ds-z-tooltip` | 600 | Tooltips above all |
| `--ds-z-toast` | 700 | Toast queue |
| `--ds-z-spotlight` | 800 | Command palette |
| `--ds-z-max` | 9999 | Last resort — debug overlay |

Total: **11 z-index tokens**.

---

## 8 · Grid & breakpoints

| Token | Value | Use |
|---|---|---|
| `--ds-bp-xs` | 480px | Phone |
| `--ds-bp-sm` | 640px | Large phone |
| `--ds-bp-md` | 768px | Tablet |
| `--ds-bp-lg` | 1024px | Laptop |
| `--ds-bp-xl` | 1280px | Desktop |
| `--ds-bp-2xl` | 1536px | Wide desktop |
| `--ds-grid-cols-default` | 12 | Default page grid |
| `--ds-grid-gap-default` | `var(--ds-spacing-6)` | Column gap |
| `--ds-grid-max-width` | 1440px | Page max width |

Total: **9 grid tokens**.

### Container queries

Container queries are preferred over media queries inside components:

```css
.card-grid {
  container-type: inline-size;
}
@container (min-inline-size: var(--ds-bp-md)) {
  .card-grid > .card { grid-column: span 4; }
}
```

---

## Summary

| Category | Token count |
|---|---|
| Color (primitive + semantic + status + brand) | ≈ 200 |
| Typography | 24 |
| Spacing | 30 |
| Radius | 10 |
| Shadow | 10 |
| Motion | 15 |
| Z-index | 11 |
| Grid | 9 |
| **Total** | **≈ 310** |

Every one of these is mirrored in `tokens.figma.json` so designers consume the same source.
See `docs/themes.md` for how each theme overrides the semantic layer.
