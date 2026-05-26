# Themes

`@ds/core` ships **8 themes**. Each one is a `.css` file in `packages/ds/src/themes/` that overrides
*only* the semantic layer (Layer 2) — never primitives. Components never branch on theme; they read
semantic vars and the theme rewrites them.

Switching theme:

```ts
import { applyTheme } from "@ds/core/themes";
applyTheme("luxury"); // sets <html data-ds-theme="luxury"> and class ds-theme-luxury
```

Or markup-only:

```html
<html data-ds-theme="luxury" class="ds-theme-luxury">
```

The theme engine lives in `src/themes/theme-engine.ts`. It persists the choice in `localStorage`
under `ds:theme` and exposes `getTheme()`, `subscribeTheme(cb)`.

---

## 1 · `light`

Default light theme. Neutral primary, blue link, conservative shadows.

```
+----------------------------------------+
| #FAFAFA      [neutral-50]              |
|                                        |
|  +----------------------------------+  |
|  |  #FFFFFF    [bg-raised]          |  |
|  |  ## Headline neutral-900         |  |
|  |  Body text neutral-700           |  |
|  |  [ Primary indigo-600 ]          |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — default for any web product. Safe baseline for accessibility (AAA contrast for body).

**Top 10 semantic overrides vs primitive defaults**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `--ds-color-neutral-50` |
| `--ds-color-bg-raised` | `oklch(100% 0 0)` |
| `--ds-color-bg-overlay` | `oklch(100% 0 0)` |
| `--ds-color-text-primary` | `--ds-color-neutral-900` |
| `--ds-color-text-secondary` | `--ds-color-neutral-700` |
| `--ds-color-border-default` | `--ds-color-neutral-200` |
| `--ds-color-primary-500` | `--ds-color-indigo-500` |
| `--ds-color-focus-ring` | `oklch(58% 0.20 265 / 0.5)` |
| `--ds-shadow-md` | umbra+penumbra at 8% black |
| `--ds-radius-md` | `6px` |

---

## 2 · `dark`

Default dark theme. Neutral surface, same indigo primary, deeper shadows.

```
+----------------------------------------+
| #0A0A0F      [neutral-950]             |
|                                        |
|  +----------------------------------+  |
|  |  #18181B    [bg-raised]          |  |
|  |  ## Headline neutral-50          |  |
|  |  Body text neutral-300           |  |
|  |  [ Primary indigo-400 ]          |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — default after sundown; consumer SaaS, dev tools.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `--ds-color-neutral-950` |
| `--ds-color-bg-raised` | `--ds-color-neutral-900` |
| `--ds-color-bg-overlay` | `--ds-color-neutral-800` |
| `--ds-color-text-primary` | `--ds-color-neutral-50` |
| `--ds-color-text-secondary` | `--ds-color-neutral-300` |
| `--ds-color-border-default` | `--ds-color-neutral-700` |
| `--ds-color-primary-500` | `--ds-color-indigo-400` |
| `--ds-color-focus-ring` | `oklch(75% 0.18 265 / 0.45)` |
| `--ds-shadow-md` | umbra+penumbra at 40% black |
| `--ds-color-bg-sunken` | `--ds-color-neutral-950` |

---

## 3 · `amoled`

True-black background `#000000`. Max contrast, OLED-friendly, zero light bleed.

```
+----------------------------------------+
| #000000      [pure black]              |
|                                        |
|  +----------------------------------+  |
|  | #0A0A0A    [bg-raised]           |  |
|  | ## Headline neutral-50           |  |
|  | Body text neutral-200            |  |
|  | [ Primary white outline ]        |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — mobile OLED apps, theaters, presentation mode. Battery-saving on AMOLED panels.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `oklch(0% 0 0)` |
| `--ds-color-bg-raised` | `oklch(5% 0 0)` |
| `--ds-color-bg-overlay` | `oklch(10% 0 0)` |
| `--ds-color-text-primary` | `oklch(98% 0 0)` |
| `--ds-color-border-default` | `oklch(20% 0 0)` |
| `--ds-color-border-subtle` | `oklch(12% 0 0)` |
| `--ds-color-primary-500` | `oklch(80% 0.05 240)` |
| `--ds-shadow-md` | `none` (pure black, no shadow needed) |
| `--ds-color-focus-ring` | `oklch(95% 0 0 / 0.6)` (white) |
| `--ds-color-selection-bg` | `oklch(30% 0.1 240)` |

---

## 4 · `luxury`

Deep charcoal background, warm gold accent, serif display family.

```
+----------------------------------------+
| #1A1614      [warm charcoal]           |
|                                        |
|  +----------------------------------+  |
|  |  #25201D    [bg-raised]          |  |
|  |  ## Headline warm-100 (serif)    |  |
|  |  Body text warm-300              |  |
|  |  [ Accent gold-500 oklch(76 .14 |  |
|  |    85) ]                         |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — hospitality, private banking, premium concierge, watch / jewelry e-commerce.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `oklch(16% 0.012 50)` (warm dark) |
| `--ds-color-bg-raised` | `oklch(22% 0.012 50)` |
| `--ds-color-text-primary` | `oklch(96% 0.01 80)` (warm white) |
| `--ds-color-primary-500` | `oklch(76% 0.14 85)` (gold) |
| `--ds-color-accent-500` | `oklch(76% 0.14 85)` (gold) |
| `--ds-color-border-default` | `oklch(32% 0.012 50)` |
| `--ds-font-display` | `"Source Serif", Georgia, serif` |
| `--ds-radius-md` | `8px` (slightly softer) |
| `--ds-radius-lg` | `12px` |
| `--ds-shadow-md` | warm-tinted shadow |

---

## 5 · `glass`

Translucent surfaces, heavy backdrop-blur, frosted glass material.

```
+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+
| (gradient backdrop)                    |
|                                        |
|  +============================+        |
|  | (translucent surface 60%)  |        |
|  |  backdrop-blur(24px)       |        |
|  |  border 1px white/15%      |        |
|  |  ## Headline (clear)       |        |
|  |  Body (slight translucent) |        |
|  +============================+        |
+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+
```

**When to use** — marketing landings, hero panels, settings sheets over a vibrant photo background.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `oklch(15% 0.008 250 / 0.6)` |
| `--ds-color-bg-raised` | `oklch(20% 0.01 250 / 0.55)` |
| `--ds-color-bg-overlay` | `oklch(98% 0 0 / 0.08)` |
| `--ds-color-border-default` | `oklch(100% 0 0 / 0.15)` |
| `--ds-color-border-subtle` | `oklch(100% 0 0 / 0.08)` |
| `--ds-effect-backdrop-blur` | `24px` (custom token) |
| `--ds-shadow-md` | inset 1px white/10% + outer drop |
| `--ds-color-text-primary` | `oklch(98% 0 0)` |
| `--ds-color-text-secondary` | `oklch(85% 0 0)` |
| `--ds-color-focus-ring` | `oklch(95% 0 0 / 0.6)` |

⚠ Glass theme requires a non-flat parent background to make sense. Use `applyTheme("glass")` after
mounting a hero image / gradient — or it will look like plain dark.

---

## 6 · `enterprise`

High-contrast, conservative, blue-corporate primary, square radii.

```
+----------------------------------------+
| #FFFFFF      [white]                   |
|                                        |
|  +----------------------------------+  |
|  | #F4F6FA    [bg-raised]           |  |
|  | ## Headline neutral-900          |  |
|  | Body text neutral-800            |  |
|  | [ Primary blue-700 ] [ square ]  |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — B2B SaaS, banking dashboards, healthcare, government. Looks at home next to
SAP / Salesforce / Oracle.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `oklch(100% 0 0)` |
| `--ds-color-bg-raised` | `oklch(96% 0.005 250)` |
| `--ds-color-text-primary` | `--ds-color-neutral-900` |
| `--ds-color-primary-500` | `--ds-color-blue-700` |
| `--ds-color-border-default` | `--ds-color-neutral-300` |
| `--ds-radius-sm` | `2px` |
| `--ds-radius-md` | `4px` |
| `--ds-radius-lg` | `4px` |
| `--ds-font-sans` | `"IBM Plex Sans", system-ui, sans-serif` |
| `--ds-shadow-md` | very subtle, no blur |

---

## 7 · `neon`

Cyberpunk, magenta + cyan accents, glow shadows on focused / hovered surfaces.

```
+----------------------------------------+
| #08081A      [deep ink]                |
|                                        |
|  +----------------------------------+  |
|  |  #11112B   [bg-raised]           |  |
|  |  ## HEADLINE (magenta glow)      |  |
|  |  Body text neutral-100           |  |
|  |  [ Primary magenta + cyan glow ] |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — gaming, web3, esports, generative art apps, AI labs that lean cyber-aesthetic.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `oklch(10% 0.05 280)` |
| `--ds-color-bg-raised` | `oklch(15% 0.06 285)` |
| `--ds-color-primary-500` | `--ds-color-magenta-500` |
| `--ds-color-secondary-500` | `--ds-color-cyan-500` |
| `--ds-color-accent-500` | `--ds-color-violet-400` |
| `--ds-shadow-glow-accent` | `0 0 32px -2px var(--ds-color-magenta-500)` |
| `--ds-shadow-md` | with cyan glow at 15% |
| `--ds-color-focus-ring` | `var(--ds-color-cyan-400)` |
| `--ds-color-border-default` | `oklch(30% 0.08 290)` |
| `--ds-font-display` | `"Geist Mono", "JetBrains Mono", monospace` |

---

## 8 · `monochrome`

Strict grayscale. No hue at all. Status colors expressed via shape/icon, not chroma.

```
+----------------------------------------+
| #FFFFFF                                |
|                                        |
|  +----------------------------------+  |
|  |  #F4F4F5    [bg-raised]          |  |
|  |  ## Headline #18181B             |  |
|  |  Body text #3F3F46               |  |
|  |  [ Primary #18181B black ]       |  |
|  +----------------------------------+  |
+----------------------------------------+
```

**When to use** — editorial, archives, museum / gallery sites, dev portfolios, minimalist tools.
Print-ready by default.

**Top 10 semantic overrides**

| Semantic | Resolves to |
|---|---|
| `--ds-color-bg-base` | `--ds-color-neutral-50` |
| `--ds-color-bg-raised` | `oklch(100% 0 0)` |
| `--ds-color-text-primary` | `--ds-color-neutral-950` |
| `--ds-color-primary-500` | `--ds-color-neutral-900` |
| `--ds-color-accent-500` | `--ds-color-neutral-700` |
| `--ds-color-status-success-fg` | `--ds-color-neutral-900` (paired with check icon) |
| `--ds-color-status-error-fg` | `--ds-color-neutral-900` (paired with cross icon) |
| `--ds-color-status-info-fg` | `--ds-color-neutral-900` |
| `--ds-color-focus-ring` | `--ds-color-neutral-900` |
| `--ds-shadow-md` | pure black at 6% |

---

## Switching at runtime

```ts
import { applyTheme, getTheme, subscribeTheme } from "@ds/core/themes";

// Apply
applyTheme("luxury"); // sets <html data-ds-theme="luxury" class="ds-theme-luxury">

// Read
const current = getTheme(); // "luxury"

// Subscribe
const unsubscribe = subscribeTheme((next) => {
  console.log("theme is now", next);
});
```

`applyTheme` is SSR-safe: on the server it returns the theme string without touching `document`.
Pair it with `<html data-ds-theme={theme}>` in your root layout to avoid FOUC.

```tsx
// app/layout.tsx
import { cookies } from "next/headers";
export default async function Root({ children }) {
  const theme = (await cookies()).get("ds-theme")?.value ?? "light";
  return (
    <html lang="en" data-ds-theme={theme} className={`ds-theme-${theme}`}>
      <body>{children}</body>
    </html>
  );
}
```

## Composing theme + brand

Theme is the structural skin (light vs dark, glass vs flat). Brand is the tenant identity (red vs
green primary, Inter vs IBM Plex font). They compose:

```ts
applyTheme("dark");
applyBrand({
  colors: { primary: "oklch(70% 0.22 25)" }, // bright red primary
  typography: { sans: "'IBM Plex Sans', system-ui, sans-serif" },
});
```

See `docs/white-label.md` for the full brand override API.

## Adding a new theme

1. Add `src/themes/<id>.css` with `[data-ds-theme="<id>"] { --ds-color-bg-base: ... }`.
2. Register the id in `src/themes/theme-engine.ts` (`THEMES` array).
3. Document it here in `docs/themes.md` with screenshot + top 10 overrides.
4. Add a column in `tokens.figma.json` modes for every semantic token.
5. Bump MINOR in `CHANGELOG.md`.
