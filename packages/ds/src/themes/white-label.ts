/**
 * @ds/core · white-label
 *
 * Runtime brand injection. Pushes brand-specific custom properties onto a
 * target element so downstream components automatically pick them up via the
 * normal token cascade. SSR-safe (no DOM mutations when document is absent).
 *
 * Strategy:
 *   - Colors: accept hex / rgb / oklch / hsl strings. When OKLCH is supplied,
 *     interpolate an 11-stop scale (50..950) by sweeping lightness.
 *   - Typography: write `--ds-font-{sans,display,mono}`.
 *   - Radius/shadow/motion/density: write the matching scale tokens.
 *   - Logo/icon: stash as data attributes + custom properties for components.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BrandOverrides {
  colors?: Partial<Record<"primary" | "accent" | "neutral", string>>;
  typography?: { sans?: string; display?: string; mono?: string };
  radius?: Partial<Record<"sm" | "md" | "lg" | "xl" | "card" | "button" | "input", string>>;
  shadow?: Partial<Record<"sm" | "md" | "lg" | "xl", string>>;
  motionScale?: number;
  densityScale?: number;
  logo?: { src: string; alt: string; width?: number; height?: number };
  icon?: { strokeWidth?: number; variant?: "outline" | "solid" };
}

const SCALE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
type ScaleStop = (typeof SCALE_STOPS)[number];

/**
 * Lightness profile for an 11-stop scale (in oklch percentages).
 * Anchored at 500 = perceived brand color. Stop 50 = lightest, 950 = darkest.
 */
const SCALE_LIGHTNESS: Record<ScaleStop, number> = {
  50: 97,
  100: 94,
  200: 88,
  300: 80,
  400: 70,
  500: 60,
  600: 52,
  700: 44,
  800: 36,
  900: 28,
  950: 20,
};

/* ------------------------------------------------------------------ */
/*  Color parsing — minimal but defensive                              */
/* ------------------------------------------------------------------ */

interface OklchTriple {
  l: number; // 0..100
  c: number; // chroma
  h: number; // hue 0..360
  alpha: number;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i;

function parseOklch(input: string): OklchTriple | null {
  const m = OKLCH_RE.exec(input.trim());
  if (!m) return null;
  const lRaw = Number(m[1]);
  const c = Number(m[2]);
  const h = Number(m[3]);
  const alphaRaw = m[4];
  let alpha = 1;
  if (alphaRaw !== undefined) {
    alpha = alphaRaw.endsWith("%") ? Number(alphaRaw.slice(0, -1)) / 100 : Number(alphaRaw);
  }
  if ([lRaw, c, h, alpha].some((n) => Number.isNaN(n))) return null;
  // Accept both "60" and "60%" — normalize to 0..100.
  const l = lRaw <= 1 ? lRaw * 100 : lRaw;
  return { l, c, h, alpha };
}

function parseHex(input: string): OklchTriple | null {
  const hex = input.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const expand = (s: string) => (s.length === 3 ? s.split("").map((c) => c + c).join("") : s);
  const norm = expand(hex.length === 8 ? hex.slice(0, 6) : hex);
  const r = parseInt(norm.slice(0, 2), 16) / 255;
  const g = parseInt(norm.slice(2, 4), 16) / 255;
  const b = parseInt(norm.slice(4, 6), 16) / 255;
  const alpha = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return rgbToOklch(r, g, b, alpha);
}

function parseRgb(input: string): OklchTriple | null {
  const m = /^rgba?\(\s*([\d.]+)\s*[ ,]\s*([\d.]+)\s*[ ,]\s*([\d.]+)(?:\s*[ ,/]\s*([\d.]+%?))?\s*\)$/i.exec(
    input.trim(),
  );
  if (!m) return null;
  const r = Number(m[1]) / 255;
  const g = Number(m[2]) / 255;
  const b = Number(m[3]) / 255;
  const alphaRaw = m[4];
  let alpha = 1;
  if (alphaRaw !== undefined) {
    alpha = alphaRaw.endsWith("%") ? Number(alphaRaw.slice(0, -1)) / 100 : Number(alphaRaw);
  }
  if ([r, g, b, alpha].some((n) => Number.isNaN(n))) return null;
  return rgbToOklch(r, g, b, alpha);
}

/**
 * sRGB → OKLCH. Adapted from the CSS Color 4 reference algorithm
 * (https://www.w3.org/TR/css-color-4/#color-conversion-code).
 */
function rgbToOklch(r: number, g: number, b: number, alpha: number): OklchTriple {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);

  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bb * bb);
  const Hrad = Math.atan2(bb, a);
  const H = ((Hrad * 180) / Math.PI + 360) % 360;

  return { l: L * 100, c: C, h: H, alpha };
}

function toOklch(input: string): OklchTriple | null {
  const trimmed = input.trim();
  if (trimmed.startsWith("oklch")) return parseOklch(trimmed);
  if (trimmed.startsWith("#")) return parseHex(trimmed);
  if (trimmed.startsWith("rgb")) return parseRgb(trimmed);
  return null;
}

function formatOklch({ l, c, h, alpha }: OklchTriple): string {
  const base = `oklch(${l.toFixed(2)}% ${c.toFixed(4)} ${h.toFixed(2)}`;
  return alpha >= 1 ? `${base})` : `${base} / ${alpha.toFixed(3)})`;
}

/* ------------------------------------------------------------------ */
/*  Scale generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Given any OKLCH/hex/rgb color, generate an 11-stop scale by interpolating
 * lightness against the SCALE_LIGHTNESS profile. Chroma tapers toward the
 * extremes to prevent unrealistic, oversaturated tints/shades.
 */
export function generateScale(baseColor: string): Record<ScaleStop, string> {
  const oklch = toOklch(baseColor);
  if (!oklch) {
    // Fallback grayscale on parse failure so we still produce a valid scale.
    const result = {} as Record<ScaleStop, string>;
    for (const stop of SCALE_STOPS) {
      result[stop] = `oklch(${SCALE_LIGHTNESS[stop]}% 0 0)`;
    }
    return result;
  }

  const result = {} as Record<ScaleStop, string>;
  for (const stop of SCALE_STOPS) {
    const targetL = SCALE_LIGHTNESS[stop];
    // Taper chroma at the ends — pastel scales near 50 and muted near 950.
    const distance = Math.abs(targetL - 60) / 60; // 0 at L=60, ~0.65 at extremes
    const chromaScale = Math.max(0.35, 1 - distance * 0.55);
    const c = oklch.c * chromaScale;
    result[stop] = formatOklch({ l: targetL, c, h: oklch.h, alpha: oklch.alpha });
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  apply / clear / serialize                                          */
/* ------------------------------------------------------------------ */

const BRAND_ATTR = "data-ds-brand";
const MANAGED_PROPS_ATTR = "data-ds-brand-props";

function getTarget(root?: HTMLElement | null): HTMLElement | null {
  if (root === null) return null;
  if (root) return root;
  if (typeof document === "undefined") return null;
  return document.documentElement;
}

function setProp(el: HTMLElement, prop: string, value: string, managed: string[]): void {
  el.style.setProperty(prop, value);
  managed.push(prop);
}

/**
 * Applies a brand definition to the target element. SSR-safe: returns silently
 * when no document is available.
 */
export function applyBrand(brand: BrandOverrides, root?: HTMLElement | null): void {
  const el = getTarget(root);
  if (!el) return;

  // Wipe any previously applied brand props so consecutive applyBrand calls
  // don't accumulate stale variables.
  clearBrand(el);

  const managed: string[] = [];

  /* Colors -------------------------------------------------------- */
  if (brand.colors) {
    for (const role of ["primary", "accent", "neutral"] as const) {
      const value = brand.colors[role];
      if (!value) continue;
      const scale = generateScale(value);
      setProp(el, `--ds-color-${role}`, value, managed);
      for (const [stop, hex] of Object.entries(scale)) {
        setProp(el, `--ds-color-${role}-${stop}`, hex, managed);
      }
    }
  }

  /* Typography ---------------------------------------------------- */
  if (brand.typography) {
    if (brand.typography.sans) setProp(el, "--ds-font-sans", brand.typography.sans, managed);
    if (brand.typography.display) setProp(el, "--ds-font-display", brand.typography.display, managed);
    if (brand.typography.mono) setProp(el, "--ds-font-mono", brand.typography.mono, managed);
  }

  /* Radius -------------------------------------------------------- */
  if (brand.radius) {
    for (const [key, value] of Object.entries(brand.radius)) {
      if (value) setProp(el, `--ds-radius-${key}`, value, managed);
    }
  }

  /* Shadow -------------------------------------------------------- */
  if (brand.shadow) {
    for (const [key, value] of Object.entries(brand.shadow)) {
      if (value) setProp(el, `--ds-shadow-${key}`, value, managed);
    }
  }

  /* Motion / density scale --------------------------------------- */
  if (typeof brand.motionScale === "number" && Number.isFinite(brand.motionScale)) {
    setProp(el, "--ds-motion-scale", String(brand.motionScale), managed);
  }
  if (typeof brand.densityScale === "number" && Number.isFinite(brand.densityScale)) {
    setProp(el, "--ds-density-scale", String(brand.densityScale), managed);
  }

  /* Logo ---------------------------------------------------------- */
  if (brand.logo) {
    setProp(el, "--ds-brand-logo", `url("${brand.logo.src}")`, managed);
    el.setAttribute("data-ds-brand-logo-src", brand.logo.src);
    el.setAttribute("data-ds-brand-logo-alt", brand.logo.alt);
    if (brand.logo.width) el.setAttribute("data-ds-brand-logo-width", String(brand.logo.width));
    if (brand.logo.height) el.setAttribute("data-ds-brand-logo-height", String(brand.logo.height));
  }

  /* Icon ---------------------------------------------------------- */
  if (brand.icon) {
    if (typeof brand.icon.strokeWidth === "number") {
      setProp(el, "--ds-icon-stroke-width", String(brand.icon.strokeWidth), managed);
    }
    if (brand.icon.variant) {
      el.setAttribute("data-ds-icon-variant", brand.icon.variant);
    }
  }

  el.setAttribute(BRAND_ATTR, "applied");
  el.setAttribute(MANAGED_PROPS_ATTR, managed.join("|"));
}

/**
 * Removes every CSS property previously written by `applyBrand` on this element.
 * Safe to call when no brand has been applied — no-op.
 */
export function clearBrand(root?: HTMLElement | null): void {
  const el = getTarget(root);
  if (!el) return;

  const managed = el.getAttribute(MANAGED_PROPS_ATTR);
  if (managed) {
    for (const prop of managed.split("|")) {
      if (prop) el.style.removeProperty(prop);
    }
  }

  for (const attr of [
    BRAND_ATTR,
    MANAGED_PROPS_ATTR,
    "data-ds-brand-logo-src",
    "data-ds-brand-logo-alt",
    "data-ds-brand-logo-width",
    "data-ds-brand-logo-height",
    "data-ds-icon-variant",
  ]) {
    el.removeAttribute(attr);
  }
}

/* ------------------------------------------------------------------ */
/*  Serialization (SSR-safe transport)                                 */
/* ------------------------------------------------------------------ */

/**
 * Serializes a BrandOverrides into a compact JSON string. Use to ship the
 * brand definition from server → client (cookies, headers, HTML data-attr).
 */
export function serializeBrand(brand: BrandOverrides): string {
  return JSON.stringify(brand);
}

/**
 * Parses a serialized brand string. Throws nothing — returns an empty object
 * on malformed input.
 */
export function parseBrand(serialized: string): BrandOverrides {
  if (!serialized) return {};
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (parsed && typeof parsed === "object") return parsed as BrandOverrides;
    return {};
  } catch {
    return {};
  }
}
