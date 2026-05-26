# `@ds/core` — Token-first enterprise design system

> Multi-theme, multi-brand, multi-tenant, white-label, WCAG AAA. Zero hardcoded values.
> Authored as an independent package: no dependency on Hearst Connect or Cockpit.

## Quick start

```ts
// 1 · Mount tokens + your chosen theme(s) once at app root
import "@ds/core/tokens";
import "@ds/core/themes/dark";
import "@ds/core/themes/glass";

// 2 · Wrap your app
<html data-ds-theme="dark">
  <body>{children}</body>
</html>

// 3 · Use a primitive
import { Button } from "@ds/core/primitives/button";

<Button variant="primary" size="md">Ship it</Button>
```

## What you get

| Layer | Where |
|---|---|
| Primitive tokens (colors, spacing, typo, radius, shadows, motion, z-index) | `src/tokens/` |
| 8 themes (light, dark, amoled, luxury, glass, enterprise, neon, monochrome) | `src/themes/` |
| Theme engine + white-label runtime | `src/themes/theme-engine.ts`, `white-label.ts` |
| Motion engine (springs, presets, reduced-motion) | `src/motion/` |
| Tailwind v4 preset | `src/tailwind/preset.ts` |
| 40+ primitives | `src/primitives/` |
| Composition utilities (`cn`, polymorphic, slot, responsive) | `src/utils/` |
| 3 reference apps (Dashboard, AI SaaS, Landing) | `examples/` |
| Figma variables JSON (Figma-importable) | `tokens.figma.json` |
| Style guide | `docs/` |

## Non-negotiables

See [CONTRACT.md](./CONTRACT.md) for the build contract every contributor must respect.

The TL;DR:

1. **Zero hardcoded values.** Every visual property comes from a CSS custom property in `--ds-*` namespace.
2. **Themes change everything by swapping a class — components never know which theme is active.**
3. **WCAG AAA floor** on text contrast, focus rings, touch targets, keyboard nav, reduced-motion.
4. **Tree-shakable.** Named exports only.
5. **Tested.** Every primitive ships with a colocated test.
