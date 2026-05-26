/**
 * @ds/core · theme-engine
 *
 * Runtime helpers to apply/detect/persist themes. SSR-safe (no crash when
 * `window`/`document`/`matchMedia` are absent).
 *
 * Theme application sets BOTH `data-ds-theme="<id>"` and `class="ds-theme-<id>"`
 * (additive, removing prior theme classes) so consumers can target either.
 */

export type ThemeId =
  | "light"
  | "dark"
  | "amoled"
  | "luxury"
  | "glass"
  | "enterprise"
  | "neon"
  | "monochrome";

export const THEMES = [
  "light",
  "dark",
  "amoled",
  "luxury",
  "glass",
  "enterprise",
  "neon",
  "monochrome",
] as const satisfies readonly ThemeId[];

const STORAGE_KEY = "ds-theme";
const THEME_CLASS_RE = /(?:^|\s)ds-theme-[a-z]+(?=\s|$)/g;

function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

function getDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function getWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

/**
 * Applies a theme to the given root element (defaults to <html>).
 * SSR-safe: returns early if no document is available and `root` is null/undefined.
 * Pure when `root === null` is passed explicitly.
 */
export function applyTheme(theme: ThemeId, root?: HTMLElement | null): void {
  if (root === null) return; // explicit no-op (SSR injection helpers)

  let target: HTMLElement | null = root ?? null;
  if (!target) {
    const doc = getDocument();
    if (!doc) return;
    target = doc.documentElement;
  }

  target.setAttribute("data-ds-theme", theme);

  const current = target.className;
  const cleaned = current.replace(THEME_CLASS_RE, "").trim();
  const nextClass = `${cleaned} ds-theme-${theme}`.trim();
  if (nextClass !== current) target.className = nextClass;

  // Hint UA controls (scrollbars, form widgets)
  const colorScheme = theme === "light" || theme === "enterprise" ? "light" : "dark";
  target.style.setProperty("color-scheme", colorScheme);
}

/**
 * Detects the user's OS-level preference. Returns `"light"` as a safe default
 * when `matchMedia` is unavailable (SSR, old browsers).
 */
export function detectSystemTheme(): "light" | "dark" {
  const win = getWindow();
  if (!win || typeof win.matchMedia !== "function") return "light";
  return win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Reads a previously stored theme. Returns null when storage is unavailable or
 * the stored value is not a known ThemeId.
 */
export function getStoredTheme(): ThemeId | null {
  const win = getWindow();
  if (!win) return null;
  try {
    const raw = win.localStorage?.getItem(STORAGE_KEY);
    return isThemeId(raw) ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Persists the chosen theme in localStorage. No-op on SSR or when storage is
 * blocked (private mode, quota, disabled cookies).
 */
export function storeTheme(theme: ThemeId): void {
  const win = getWindow();
  if (!win) return;
  try {
    win.localStorage?.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

/**
 * Subscribes to OS-level color-scheme changes. Returns an unsubscribe function.
 * No-op (returns a noop) on SSR.
 */
export function subscribeSystemTheme(cb: (t: "light" | "dark") => void): () => void {
  const win = getWindow();
  if (!win || typeof win.matchMedia !== "function") return () => {};

  const mql = win.matchMedia("(prefers-color-scheme: dark)");
  const handler = (e: MediaQueryListEvent) => cb(e.matches ? "dark" : "light");

  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }
  // Safari < 14 fallback
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  mql.addListener(handler);
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    mql.removeListener(handler);
  };
}

/**
 * Metadata for each theme — exposed for theme switchers, preview swatches,
 * docs and Storybook.
 *
 * `preview` colors are static OKLCH strings that approximate the theme's
 * page background, primary text, and accent. Safe to render in <style> tags.
 */
export const THEME_META: Record<
  ThemeId,
  {
    label: string;
    description: string;
    preview: { bg: string; fg: string; accent: string };
  }
> = {
  light: {
    label: "Light",
    description: "Clean default with neutral indigo accent. AAA contrast.",
    preview: { bg: "oklch(98.5% 0.003 250)", fg: "oklch(18% 0.015 250)", accent: "oklch(50% 0.20 265)" },
  },
  dark: {
    label: "Dark",
    description: "Refined zinc surfaces with brighter indigo accent.",
    preview: { bg: "oklch(12% 0.006 250)", fg: "oklch(97% 0.003 250)", accent: "oklch(75% 0.16 265)" },
  },
  amoled: {
    label: "AMOLED",
    description: "True black for OLED screens and maximum contrast.",
    preview: { bg: "oklch(0% 0 0)", fg: "oklch(99% 0 0)", accent: "oklch(78% 0.18 265)" },
  },
  luxury: {
    label: "Luxury",
    description: "Deep charcoal with luminous gold accent. Premium feel.",
    preview: { bg: "oklch(11% 0.004 60)", fg: "oklch(95% 0.02 85)", accent: "oklch(80% 0.15 85)" },
  },
  glass: {
    label: "Glass",
    description: "Translucent surfaces with heavy blur. Immersive layered UI.",
    preview: { bg: "oklch(13% 0.008 250)", fg: "oklch(98% 0.003 250)", accent: "oklch(78% 0.18 265)" },
  },
  enterprise: {
    label: "Enterprise",
    description: "Conservative B2B SaaS look. Corporate blue, low saturation.",
    preview: { bg: "oklch(98% 0.004 240)", fg: "oklch(15% 0.020 240)", accent: "oklch(45% 0.18 240)" },
  },
  neon: {
    label: "Neon",
    description: "Cyberpunk magenta + cyan dual accent. Heavy glow.",
    preview: { bg: "oklch(6% 0.008 320)", fg: "oklch(98% 0.005 320)", accent: "oklch(75% 0.25 320)" },
  },
  monochrome: {
    label: "Monochrome",
    description: "Pure grayscale. Brutalist and print-friendly.",
    preview: { bg: "oklch(10% 0 0)", fg: "oklch(98% 0 0)", accent: "oklch(99% 0 0)" },
  },
};
