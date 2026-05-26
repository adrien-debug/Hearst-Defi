# White-Label Guide

`@ds/core` ships a runtime branding API so a single codebase can serve N tenants without forking,
without rebuilding, and without exploding the CSS bundle. This doc walks through every override
you can apply and shows three concrete tenant configurations.

The runtime lives in `packages/ds/src/themes/white-label.ts`. The function surface is:

```ts
import {
  applyBrand,
  resetBrand,
  serializeBrand,
  parseBrand,
  getBrand,
} from "@ds/core/white-label";
```

---

## 1 · What you can override

| Family | Tokens you can replace | Notes |
|---|---|---|
| **Colors** | `primary.{50..950}`, `secondary.{50..950}`, `accent.{50..950}`, `focus-ring`, status families | Pass either a single anchor (`primary: "oklch(70% 0.2 25)"`) and let the engine generate the ramp, or a full object with 11 stops |
| **Typography** | `sans`, `serif`, `mono`, `display`, `weights` | Font stacks as CSS strings; weight remap as object |
| **Radius** | `xs..3xl`, `pill`, `circle` | Pass any subset; missing ones keep defaults |
| **Shadow** | all 10 shadow tokens | Provide full CSS shadow strings |
| **Motion** | durations (`fast/base/moderate/slow`), easings | Speed up / slow down per tenant |
| **Icons** | `pack`, `strokeWidth`, sizes | Swap `lucide-react` for a tenant's icon set via render slot |
| **Density** | `compact | comfortable | spacious` | Default multiplier |
| **Logo** | `logo`, `logoMark`, `wordmark` | React node injected into `Topbar.Logo` |
| **Copy** | `productName`, `taglineDefault` | String overrides for default surfaces |

Anything outside this list is **structural** — it can't be overridden via white-label and requires
either a theme PR or a fork. By design.

---

## 2 · Minimal example

```ts
import { applyBrand } from "@ds/core/white-label";

applyBrand({
  colors: {
    primary: "oklch(70% 0.20 25)", // bright red anchor — full ramp auto-generated
  },
  typography: {
    sans: "'Söhne', system-ui, sans-serif",
  },
  radius: {
    md: "8px",
    lg: "12px",
  },
});
```

The function writes CSS custom properties on `:root` (or on a scoped element if you pass
`scope: HTMLElement`), persists to `localStorage` under `ds:brand`, and emits a
`ds:brand-changed` event so React subscribers refresh.

---

## 3 · Full override surface — typed

```ts
type BrandOverride = {
  colors?: {
    primary?: string | ColorRamp;
    secondary?: string | ColorRamp;
    accent?: string | ColorRamp;
    focusRing?: string;
    selection?: { bg?: string; fg?: string };
    status?: {
      success?: ColorRamp;
      warning?: ColorRamp;
      error?: ColorRamp;
      info?: ColorRamp;
      neutral?: ColorRamp;
    };
  };
  typography?: {
    sans?: string;
    serif?: string;
    mono?: string;
    display?: string;
    weights?: Partial<Record<"regular"|"medium"|"semibold"|"bold", number>>;
  };
  radius?: Partial<Record<
    "none"|"xs"|"sm"|"md"|"lg"|"xl"|"2xl"|"3xl"|"pill"|"circle",
    string
  >>;
  shadow?: Partial<Record<
    "xs"|"sm"|"md"|"lg"|"xl"|"2xl"|"inner"|"focus"|"glow-accent",
    string
  >>;
  motion?: {
    duration?: Partial<Record<"fast"|"base"|"moderate"|"slow", string>>;
    easing?: Partial<Record<"standard"|"emphasized"|"decelerate"|"accelerate", string>>;
  };
  density?: "compact" | "comfortable" | "spacious";
  icons?: {
    pack?: "lucide" | "phosphor" | "heroicons" | "custom";
    strokeWidth?: number;
    sizes?: Partial<Record<"sm"|"md"|"lg"|"xl", string>>;
  };
  logo?: { mark?: ReactNode; wordmark?: ReactNode; combined?: ReactNode };
  copy?: { productName?: string; tagline?: string };
};

type ColorRamp = string | Partial<Record<"50"|"100"|"200"|"300"|"400"|"500"|"600"|"700"|"800"|"900"|"950", string>>;
```

---

## 4 · SSR — serialize, hydrate, no FOUC

Server-render the brand into the initial HTML so the first paint is correct.

```tsx
// app/layout.tsx
import { getTenantBrand } from "@/lib/tenancy";
import { serializeBrand } from "@ds/core/white-label";

export default async function Root({ children }) {
  const brand = await getTenantBrand(); // your tenant resolver
  const styleString = serializeBrand(brand); // returns inline CSS

  return (
    <html lang="en" data-ds-theme="dark">
      <head>
        <style id="ds-brand" dangerouslySetInnerHTML={{ __html: styleString }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```ts
// client/boot.ts
import { parseBrand, applyBrand } from "@ds/core/white-label";

const inline = document.getElementById("ds-brand")?.textContent ?? "";
const brand = parseBrand(inline);
applyBrand(brand); // no-op visually, but hydrates the JS state
```

`serializeBrand` returns a CSS string like:

```css
:root {
  --ds-color-primary-500: oklch(70% 0.20 25);
  --ds-color-primary-600: oklch(63% 0.21 25);
  --ds-font-sans: 'Söhne', system-ui, sans-serif;
  --ds-radius-md: 8px;
  /* … */
}
```

`parseBrand` reverses it into the typed object.

---

## 5 · Persistence

Three layers are supported, pick what fits:

| Layer | Where | Use |
|---|---|---|
| **In-memory** | `applyBrand({...})` | Default; lost on reload |
| **`localStorage`** | `applyBrand({...}, { persist: "local" })` | Per-device override (user preference) |
| **Cookie** | `applyBrand({...}, { persist: "cookie", cookieName: "ds-brand" })` | Survives SSR; engine reads cookie on next render |

For multi-tenant SaaS where the brand is **tenant-scoped, not user-scoped**, do not persist on
the client — resolve at SSR from the tenant ID in the URL / session, serialize, ship the inline
style. Don't trust client `localStorage` for tenant identity.

---

## 6 · Three concrete tenants

The tenants below are imaginary but the configurations are exhaustive — they cover ≥90% of typical
override surfaces.

### 6.1 · Hospitality — "Halcyon Hotels" (Hilton-like)

Warm, navy/champagne palette, serif display, rounded corners, deliberate motion.

```ts
applyBrand({
  colors: {
    primary: { // navy ramp
      50:  "oklch(96% 0.02 240)",
      100: "oklch(92% 0.04 240)",
      200: "oklch(86% 0.07 240)",
      300: "oklch(76% 0.10 240)",
      400: "oklch(62% 0.13 240)",
      500: "oklch(45% 0.13 240)",
      600: "oklch(36% 0.12 240)",
      700: "oklch(28% 0.10 240)",
      800: "oklch(22% 0.08 240)",
      900: "oklch(16% 0.06 240)",
      950: "oklch(10% 0.05 240)",
    },
    accent: "oklch(82% 0.10 85)", // champagne anchor
    focusRing: "oklch(45% 0.13 240 / 0.55)",
  },
  typography: {
    sans:    "'Söhne', system-ui, sans-serif",
    display: "'Tiempos Headline', 'Times New Roman', serif",
    serif:   "'Tiempos Text', Georgia, serif",
  },
  radius: {
    md: "10px",
    lg: "16px",
    xl: "20px",
    "2xl": "28px",
  },
  shadow: {
    md: "0 6px 18px -4px oklch(25% 0.06 240 / 0.18)",
    lg: "0 16px 32px -8px oklch(25% 0.06 240 / 0.20)",
  },
  motion: {
    duration: { base: "260ms", moderate: "420ms" }, // slightly slower, deliberate
    easing:   { emphasized: "cubic-bezier(0.16, 1, 0.3, 1)" }, // expo-out
  },
  density: "spacious",
  copy: { productName: "Halcyon Concierge" },
});
```

### 6.2 · Cyber-security — "Sentinel Watch" (CrowdStrike-like)

Cool, deep slate / electric red, mono everywhere, square radii, fast motion.

```ts
applyBrand({
  colors: {
    primary:   "oklch(60% 0.22 25)",   // electric red
    secondary: "oklch(55% 0.18 250)",  // slate-blue
    accent:    "oklch(75% 0.18 145)",  // alert green
    focusRing: "oklch(60% 0.22 25 / 0.6)",
    status: {
      error:   { 500: "oklch(58% 0.22 25)" },
      warning: { 500: "oklch(72% 0.18 55)" },
      success: { 500: "oklch(72% 0.18 145)" },
    },
  },
  typography: {
    sans:    "'IBM Plex Sans', system-ui, sans-serif",
    mono:    "'IBM Plex Mono', ui-monospace, monospace",
    display: "'IBM Plex Sans Condensed', system-ui, sans-serif",
    weights: { medium: 500, semibold: 600, bold: 700 },
  },
  radius: {
    sm: "2px", md: "2px", lg: "4px", xl: "4px", "2xl": "6px",
  },
  shadow: {
    md: "0 1px 0 0 oklch(0% 0 0 / 0.15), 0 4px 8px -2px oklch(0% 0 0 / 0.25)",
  },
  motion: {
    duration: { fast: "80ms", base: "140ms", moderate: "220ms" }, // snappy
  },
  density: "compact",
  icons: { pack: "lucide", strokeWidth: 1.75 },
  copy: { productName: "Sentinel Watch", tagline: "Detection at machine speed." },
});
```

### 6.3 · Fintech — "Northwall Pay" (Stripe-like)

Indigo/violet, geometric sans, modular spacing, refined shadows, comfortable density.

```ts
applyBrand({
  colors: {
    primary:   "oklch(60% 0.22 270)",  // Stripe-ish indigo
    secondary: "oklch(75% 0.10 270)",
    accent:    "oklch(68% 0.20 320)",  // violet hint
    focusRing: "oklch(60% 0.22 270 / 0.55)",
  },
  typography: {
    sans:    "'Sohne', 'Inter', system-ui, sans-serif",
    display: "'Sohne Breit', 'Inter', system-ui, sans-serif",
    mono:    "'Sohne Mono', 'JetBrains Mono', monospace",
  },
  radius: {
    sm: "4px", md: "6px", lg: "10px", xl: "14px", "2xl": "20px",
  },
  shadow: {
    sm: "0 1px 2px 0 oklch(30% 0.05 270 / 0.04), 0 1px 3px 0 oklch(30% 0.05 270 / 0.06)",
    md: "0 4px 8px -2px oklch(30% 0.05 270 / 0.05), 0 2px 4px -2px oklch(30% 0.05 270 / 0.05)",
    lg: "0 12px 24px -6px oklch(30% 0.05 270 / 0.08)",
  },
  motion: {
    duration: { base: "180ms" },
    easing:   { standard: "cubic-bezier(0.32, 0.72, 0, 1)" }, // Stripe's easing
  },
  density: "comfortable",
  copy: { productName: "Northwall Pay" },
});
```

---

## 7 · Generating a ramp from a single anchor

Designers usually have a single brand color, not an 11-stop scale. Pass a single oklch string and
the engine generates the ramp by walking lightness from `98%` (`50`) to `8%` (`950`) at the
anchor's hue and chroma, with chroma damping at the extremes (avoid muddy darks, oversaturated
lights).

```ts
applyBrand({ colors: { primary: "oklch(60% 0.22 270)" } });
// Generates:
// primary-50  → oklch(98% 0.04 270)
// primary-100 → oklch(95% 0.06 270)
// primary-200 → oklch(90% 0.10 270)
// primary-300 → oklch(83% 0.14 270)
// primary-400 → oklch(74% 0.20 270)
// primary-500 → oklch(60% 0.22 270)  ← anchor, unchanged
// primary-600 → oklch(50% 0.21 270)
// primary-700 → oklch(40% 0.18 270)
// primary-800 → oklch(30% 0.14 270)
// primary-900 → oklch(20% 0.10 270)
// primary-950 → oklch(12% 0.06 270)
```

The algorithm is in `src/themes/white-label.ts → generateRamp(anchor)`. It runs on every
`applyBrand` call — sub-millisecond, zero allocations after warm-up.

If the auto-ramp doesn't match the brand spec, pass the full object instead (see Hospitality
example above).

---

## 8 · Reading the active brand

```ts
import { getBrand } from "@ds/core/white-label";
const brand = getBrand(); // returns the last-applied BrandOverride or null
```

Useful for telemetry ("which tenants use which density?") and for rendering tenant identity (the
logo + product name) in shared chrome without prop-drilling.

---

## 9 · Resetting

```ts
import { resetBrand } from "@ds/core/white-label";
resetBrand(); // removes all custom-prop overrides, clears persistence
```

Use in tenant log-out flows so the next user doesn't see the previous tenant's colors during boot.

---

## 10 · What you cannot override

- **Spacing scale.** The scale is the rhythm of the system. Tenants override density (`compact /
  comfortable / spacious`), never individual steps.
- **Z-index layers.** Stacking is structural — tenants can't reorder modals above tooltips.
- **Primitive ramps for neutral.** Tenants override `primary / secondary / accent / status`, never
  the neutral gray ramp (it's the structural backbone).
- **Component DOM structure / ARIA.** White-label is *visual*. Behavior is fixed.
- **Theme list.** Tenants pick among the 8 themes; they don't define new themes via white-label.
  If you need a new theme, ship one in `src/themes/`.

If a tenant requires one of the above, treat it as a contract escalation — file an ADR, decide
whether the system grows or whether the tenant is the wrong fit. White-label is not a substitute
for forking when the request is structural.
