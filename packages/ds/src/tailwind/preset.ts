/**
 * @ds/core — Tailwind preset (v4 + v3 compatible)
 *
 * Usage (Tailwind v4, in your `globals.css`):
 *
 *   @import "@ds/core/tokens";
 *   @import "tailwindcss";
 *
 *   // optional: enable named utilities — pull from preset
 *   @config "../node_modules/@ds/core/dist/preset.js";
 *
 * Usage (Tailwind v3, in `tailwind.config.js`):
 *
 *   import { dsPreset } from "@ds/core/tailwind";
 *   export default { presets: [dsPreset], content: [...] };
 *
 * Every theme key resolves to a CSS variable rather than a literal, so:
 *   - The preset is theme-agnostic (the variable swaps when a theme class is set).
 *   - Bundle size is constant regardless of how many themes you ship.
 *   - You can rebrand at runtime by mutating tokens (white-label engine).
 */

/* We import a lightweight Tailwind config type. We DON'T require
 * `tailwindcss` at build time — the preset is plain data. */
type TailwindContent = string | string[] | { files: string[] };
type TailwindThemeExtension = Record<string, unknown>;

export interface TailwindPresetConfig {
  darkMode?: string | string[] | ["class", string] | ["selector", string];
  content?: TailwindContent[];
  theme?: {
    extend?: TailwindThemeExtension;
    [key: string]: unknown;
  };
  plugins?: unknown[];
  future?: Record<string, boolean>;
  [key: string]: unknown;
}

/** Map a number range to a list of CSS-var-backed entries. */
const range = (
  start: number,
  end: number,
  step: number,
  fmt: (n: number) => string,
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (let n = start; n <= end; n += step) {
    out[String(n)] = fmt(n);
  }
  return out;
};

/* ----------------------------------------------------------------------------
 * Color palette — references --ds-color-<hue>-<stop>.
 * Stops emit as Tailwind shade keys so `bg-primary-500` → var(--ds-color-primary-500).
 * --------------------------------------------------------------------------*/
const stops11 = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const neutralStops = [
  0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950, 1000,
] as const;

const hueScale = (
  hue: string,
  stops: readonly number[],
): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const s of stops) {
    out[String(s)] = `var(--ds-color-${hue}-${s})`;
  }
  return out;
};

const colors = {
  /* Absolutes */
  transparent: "var(--ds-color-transparent)",
  white: "var(--ds-color-white)",
  black: "var(--ds-color-black)",

  /* Hue scales */
  neutral: hueScale("neutral", neutralStops),
  primary: hueScale("primary", stops11),
  accent: hueScale("accent", stops11),
  success: hueScale("success", stops11),
  warning: hueScale("warning", stops11),
  danger: hueScale("danger", stops11),
  info: hueScale("info", stops11),

  /* Semantic aliases — usable as `bg-surface`, `text-muted`, etc. */
  surface: {
    DEFAULT: "var(--ds-surface-base)",
    base: "var(--ds-surface-base)",
    raised: "var(--ds-surface-raised)",
    overlay: "var(--ds-surface-overlay)",
    sunken: "var(--ds-surface-sunken)",
    inverse: "var(--ds-surface-inverse)",
  },
  fg: {
    DEFAULT: "var(--ds-text-primary)",
    primary: "var(--ds-text-primary)",
    secondary: "var(--ds-text-secondary)",
    muted: "var(--ds-text-muted)",
    faint: "var(--ds-text-faint)",
    inverse: "var(--ds-text-inverse)",
    accent: "var(--ds-text-accent)",
    onAccent: "var(--ds-text-on-accent)",
    link: "var(--ds-text-link)",
    disabled: "var(--ds-text-disabled)",
    placeholder: "var(--ds-text-placeholder)",
  },
  border: {
    DEFAULT: "var(--ds-border-default)",
    strong: "var(--ds-border-strong)",
    subtle: "var(--ds-border-subtle)",
    accent: "var(--ds-border-accent)",
    primary: "var(--ds-border-primary)",
    focus: "var(--ds-border-focus)",
    inverse: "var(--ds-border-inverse)",
  },
  status: {
    success: "var(--ds-status-success-solid)",
    warning: "var(--ds-status-warning-solid)",
    danger: "var(--ds-status-danger-solid)",
    info: "var(--ds-status-info-solid)",
  },
  chart: {
    1: "var(--ds-chart-1)",
    2: "var(--ds-chart-2)",
    3: "var(--ds-chart-3)",
    4: "var(--ds-chart-4)",
    5: "var(--ds-chart-5)",
    6: "var(--ds-chart-6)",
    7: "var(--ds-chart-7)",
    8: "var(--ds-chart-8)",
    9: "var(--ds-chart-9)",
    10: "var(--ds-chart-10)",
    11: "var(--ds-chart-11)",
    12: "var(--ds-chart-12)",
  },
} as const;

/* ----------------------------------------------------------------------------
 * Spacing — full scale references --ds-spacing-<n> (note: dot → underscore).
 * --------------------------------------------------------------------------*/
const spacingSteps = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "2.5",
  "3",
  "3.5",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "14",
  "16",
  "20",
  "24",
  "28",
  "32",
  "36",
  "40",
  "48",
  "56",
  "64",
  "72",
  "80",
  "96",
  "112",
  "128",
  "144",
  "160",
  "192",
  "224",
  "256",
] as const;

const spacing: Record<string, string> = {};
for (const s of spacingSteps) {
  const tokenName = s.replace(".", "_");
  spacing[s] = `var(--ds-spacing-${tokenName})`;
}

/* ----------------------------------------------------------------------------
 * Radius
 * --------------------------------------------------------------------------*/
const borderRadius = {
  none: "var(--ds-radius-none)",
  xs: "var(--ds-radius-xs)",
  sm: "var(--ds-radius-sm)",
  DEFAULT: "var(--ds-radius-md)",
  md: "var(--ds-radius-md)",
  lg: "var(--ds-radius-lg)",
  xl: "var(--ds-radius-xl)",
  "2xl": "var(--ds-radius-2xl)",
  "3xl": "var(--ds-radius-3xl)",
  pill: "var(--ds-radius-pill)",
  full: "var(--ds-radius-full)",
  card: "var(--ds-radius-card)",
  modal: "var(--ds-radius-modal)",
  input: "var(--ds-radius-input)",
  button: "var(--ds-radius-button)",
  avatar: "var(--ds-radius-avatar)",
  badge: "var(--ds-radius-badge)",
} as const;

/* ----------------------------------------------------------------------------
 * Shadows
 * --------------------------------------------------------------------------*/
const boxShadow = {
  none: "var(--ds-shadow-none)",
  xs: "var(--ds-shadow-xs)",
  sm: "var(--ds-shadow-sm)",
  DEFAULT: "var(--ds-shadow-md)",
  md: "var(--ds-shadow-md)",
  lg: "var(--ds-shadow-lg)",
  xl: "var(--ds-shadow-xl)",
  "2xl": "var(--ds-shadow-2xl)",
  floating: "var(--ds-shadow-floating)",
  overlay: "var(--ds-shadow-overlay)",
  inset: "var(--ds-shadow-inset)",
  inner: "var(--ds-shadow-inner)",
  "glow-primary": "var(--ds-shadow-glow-primary)",
  "glow-accent": "var(--ds-shadow-glow-accent)",
  "glow-danger": "var(--ds-shadow-glow-danger)",
  "glow-success": "var(--ds-shadow-glow-success)",
  "glow-warning": "var(--ds-shadow-glow-warning)",
  "glass-soft": "var(--ds-shadow-glass-soft)",
  "glass-strong": "var(--ds-shadow-glass-strong)",
  focus: "var(--ds-shadow-focus-ring)",
} as const;

/* ----------------------------------------------------------------------------
 * Typography
 * --------------------------------------------------------------------------*/
const fontFamily = {
  sans: ["var(--ds-font-family-sans)"],
  display: ["var(--ds-font-family-display)"],
  mono: ["var(--ds-font-family-mono)"],
} as const;

const fontSizeStops = [
  "display-2xl",
  "display-xl",
  "display-lg",
  "display-md",
  "display-sm",
  "heading-xl",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-xl",
  "body-lg",
  "body-md",
  "body-sm",
  "body-xs",
  "caption",
  "overline",
  "label",
  "micro",
  "code",
  "code-sm",
] as const;

const fontSize: Record<
  string,
  [string, { lineHeight: string; letterSpacing: string; fontWeight: string }]
> = {};
for (const s of fontSizeStops) {
  fontSize[s] = [
    `var(--ds-font-size-${s})`,
    {
      lineHeight: `var(--ds-line-height-${s})`,
      letterSpacing: `var(--ds-letter-spacing-${s})`,
      fontWeight: `var(--ds-font-weight-${s})`,
    },
  ];
}

const fontWeight = {
  thin: "var(--ds-font-weight-thin)",
  extralight: "var(--ds-font-weight-extralight)",
  light: "var(--ds-font-weight-light)",
  regular: "var(--ds-font-weight-regular)",
  normal: "var(--ds-font-weight-regular)",
  medium: "var(--ds-font-weight-medium)",
  semibold: "var(--ds-font-weight-semibold)",
  bold: "var(--ds-font-weight-bold)",
  extrabold: "var(--ds-font-weight-extrabold)",
  black: "var(--ds-font-weight-black)",
} as const;

/* ----------------------------------------------------------------------------
 * Motion
 * --------------------------------------------------------------------------*/
const transitionDuration = {
  instant: "var(--ds-motion-duration-instant)",
  xs: "var(--ds-motion-duration-xs)",
  sm: "var(--ds-motion-duration-sm)",
  base: "var(--ds-motion-duration-base)",
  DEFAULT: "var(--ds-motion-duration-base)",
  md: "var(--ds-motion-duration-md)",
  lg: "var(--ds-motion-duration-lg)",
  xl: "var(--ds-motion-duration-xl)",
  "2xl": "var(--ds-motion-duration-2xl)",
} as const;

const transitionTimingFunction = {
  linear: "var(--ds-motion-ease-linear)",
  out: "var(--ds-motion-ease-out)",
  in: "var(--ds-motion-ease-in)",
  inOut: "var(--ds-motion-ease-inOut)",
  emphasized: "var(--ds-motion-ease-emphasized)",
  spring: "var(--ds-motion-ease-spring)",
  bounce: "var(--ds-motion-ease-bounce)",
} as const;

/* ----------------------------------------------------------------------------
 * Z-index
 * --------------------------------------------------------------------------*/
const zIndex = {
  deep: "var(--ds-z-deep)",
  base: "var(--ds-z-base)",
  raised: "var(--ds-z-raised)",
  docked: "var(--ds-z-docked)",
  sticky: "var(--ds-z-sticky)",
  fixed: "var(--ds-z-fixed)",
  overlay: "var(--ds-z-overlay)",
  "modal-backdrop": "var(--ds-z-modal-backdrop)",
  modal: "var(--ds-z-modal)",
  drawer: "var(--ds-z-drawer)",
  popover: "var(--ds-z-popover)",
  dropdown: "var(--ds-z-dropdown)",
  tooltip: "var(--ds-z-tooltip)",
  toast: "var(--ds-z-toast)",
  "command-palette": "var(--ds-z-command-palette)",
  spotlight: "var(--ds-z-spotlight)",
  max: "var(--ds-z-max)",
} as const;

/* ----------------------------------------------------------------------------
 * Screens / breakpoints (px values are stable across themes)
 * --------------------------------------------------------------------------*/
const screens = {
  xs: "320px",
  sm: "480px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  "3xl": "1920px",
} as const;

/* ----------------------------------------------------------------------------
 * Backdrop blur (for glass effects)
 * --------------------------------------------------------------------------*/
const backdropBlur = {
  none: "0",
  sm: "var(--ds-glass-blur-sm)",
  DEFAULT: "var(--ds-glass-blur)",
  lg: "var(--ds-glass-blur-lg)",
} as const;

/* ----------------------------------------------------------------------------
 * Container max-widths
 * --------------------------------------------------------------------------*/
const maxWidth = {
  ...spacing,
  container: "var(--ds-layout-container-max)",
  "container-wide": "var(--ds-layout-container-wide)",
  "container-narrow": "var(--ds-layout-container-narrow)",
  modal: "var(--ds-modal-max-w)",
  cmdk: "var(--ds-cmdk-max-w)",
  drawer: "var(--ds-drawer-w)",
} as const;

/* ----------------------------------------------------------------------------
 * Grid templates
 * --------------------------------------------------------------------------*/
const gridTemplateColumns = {
  ...range(1, 12, 1, (n) => `repeat(${n}, minmax(0, 1fr))`),
};

/* ----------------------------------------------------------------------------
 * Compose the preset
 * --------------------------------------------------------------------------*/
export const dsPreset: TailwindPresetConfig = {
  darkMode: ["class", "[data-ds-theme='dark']"],
  content: [],
  theme: {
    /* Hard-overrides — these REPLACE Tailwind defaults, not extend, so the
     * project can't accidentally use a non-DS color/spacing. If a project
     * needs to extend further, it does so via `theme.extend` in its own
     * tailwind config (which is merged on top). */
    colors,
    spacing,
    screens,
    extend: {
      borderRadius,
      boxShadow,
      fontFamily,
      fontSize,
      fontWeight,
      transitionDuration,
      transitionTimingFunction,
      zIndex,
      backdropBlur,
      maxWidth,
      gridTemplateColumns,
      ringColor: {
        focus: "var(--ds-color-focus-ring)",
      },
      outlineColor: {
        focus: "var(--ds-color-focus-ring)",
      },
      keyframes: {
        "ds-fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "ds-fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "ds-slide-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ds-slide-in-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ds-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "ds-pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "ds-fade-in":
          "ds-fade-in var(--ds-motion-duration-base) var(--ds-motion-ease-out)",
        "ds-fade-out":
          "ds-fade-out var(--ds-motion-duration-base) var(--ds-motion-ease-in)",
        "ds-slide-in-up":
          "ds-slide-in-up var(--ds-motion-duration-md) var(--ds-motion-ease-out)",
        "ds-slide-in-down":
          "ds-slide-in-down var(--ds-motion-duration-md) var(--ds-motion-ease-out)",
        "ds-shimmer":
          "ds-shimmer var(--ds-skeleton-duration) var(--ds-motion-ease-inOut) infinite",
        "ds-pulse-soft":
          "ds-pulse-soft var(--ds-motion-duration-2xl) var(--ds-motion-ease-inOut) infinite",
      },
    },
  },
  plugins: [],
};

export default dsPreset;
