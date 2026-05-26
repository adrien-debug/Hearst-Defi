/**
 * Cockpit design tokens — TypeScript mirror.
 *
 * Bridge between the runtime CSS tokens (defined in
 * `node_modules/@hearst/cockpit-shell/tokens.css` + `src/app/cockpit.css`)
 * and the non-CSS surfaces of the app:
 *
 *  - `@react-pdf/renderer` PDF (server-rendered, no CSS vars at runtime)
 *  - Third-party SDK theme props that only accept hex strings
 *    (Privy login modal, CockpitShell product registry, etc.)
 *
 * KEEP IN SYNC manually with the canonical CSS sources above. Any change in
 * one file MUST be mirrored here. There is no automatic resolution because the
 * CSS bundle is not parseable from Node at build time.
 *
 * Naming: every key here maps 1:1 to a `--ct-*` CSS variable.
 */

// ── Accent (Connect product colour — mirrors --ct-accent) ──────────────────
export const CT_ACCENT_HEX = "#A7FB90" as const;
// NOTE: en CSS, --ct-accent-strong est DYNAMIQUE — `color-mix(in srgb, accent
// 82%, #fff)` dans cockpit.css (78% dans le package). Cette constante n'est
// qu'une approximation figée pour les surfaces non-CSS (PDF / SDK qui ne savent
// pas faire color-mix). Ne pas l'utiliser comme source de vérité visuelle ;
// la vérité reste le token CSS. Actuellement inutilisée — gardée par symétrie.
export const CT_ACCENT_STRONG_HEX = "#C8FDB8" as const;

// Connect product colour (CockpitShell registry, Privy theme, error pages).
export const CT_PRODUCT_CONNECT_HEX = "#A7FB90" as const;

// Foreground colour for content rendered on top of CT_PRODUCT_CONNECT_HEX
// (e.g. CTA button label on dark surface). Dark for AA contrast on the light accent.
export const CT_PRODUCT_CONNECT_FG_HEX = "#0A0A0A" as const;

// ── Cockpit chrome base (dark) — minimal hex mirror for surfaces that
//    cannot rely on the global CSS (Next.js standalone error pages, etc.) ──
export const CT_CHROME = {
  bgDeep: "#000000", // mirror of --ct-bg-deep (cockpit.css = #000000, iOS black)
  textPrimary: "#ededed", // approx mirror of --ct-text-primary (light on dark)
} as const;

// ── Dark PDF palette — flattened mirror of the web dark Cockpit tokens
//    for surfaces rendered by @react-pdf/renderer that cannot use rgba()
//    over a deep background. Values are pre-composited onto bgDeep so that
//    the printable result matches the Cockpit dark UI. Distinct from
//    CT_PDF (light printable palette) and CT_CHROME (pure-black mirror).
//
//    bgDeep = #0A0A0A (slightly lifted from #000000 for PDF readability)
//    surface = #141414 (flattened --ct-surface-1 rgba(255,255,255,0.04))
//    border  = #222222 (flattened --ct-border    rgba(255,255,255,0.10))
//    text*   = flattened --ct-text-primary/muted/faint rgba(245,…) ──────────
export const CT_PDF_DARK = {
  accent: CT_ACCENT_HEX,
  bgDeep: "#0A0A0A",
  surface: "#141414",
  textPrimary: "#F5F5F5",
  textMuted: "#8A8A8A",
  textFaint: "#4A4A4A",
  border: "#222222",
} as const;

// ── Base surfaces / text (light theme PDF + dark theme web overlap) ────────
// Web tokens (dark) are CSS-only because they use rgba() over the bg.
// PDF uses the printable light palette below.

export const CT_PDF = {
  // Surfaces (light, printable)
  bg: "#ffffff",
  bgMuted: "#f7f7f7",
  bgRow: "#fafafa",

  // Text scale
  textPrimary: "#0a0a0a",
  textMuted: "#5a5a5a",
  textDim: "#999999",

  // Brand accent (printable Connect green — mirror of --ct-product-connect)
  brand: CT_PRODUCT_CONNECT_HEX,
  brandStrong: "#0a0a0a",

  // Borders
  border: "#e5e5e5",
  borderStrong: "#cfcfcf",

  // Status — INTENTIONALLY DRIFTED from the web --ct-status-* tokens.
  //
  //  web (dark UI, glow over dark surface)        PDF (light print on white)
  //  --ct-status-success: var(--ct-accent)  ←→   statusSuccess: #16a34a
  //                       (resolves #A7FB90)
  //  --ct-status-warning: #fbbf24           ←→   statusWarning: #d97706
  //  --ct-status-danger:  #f87171           ←→   statusDanger:  #dc2626
  //
  // The web values are Tailwind ~400 (light, glowing) for AA contrast on the
  // dark Cockpit surface; the PDF values are Tailwind ~600/700 (saturated,
  // dense ink) for AA contrast on white paper. They MUST stay different — if
  // they're ever unified, web glows wash out OR PDF prints look anemic.
  //
  // `src/lib/__tests__/cockpit-tokens.test.ts` pins both sides to fail loudly
  // if anyone "harmonizes" them silently.
  statusSuccess: "#16a34a",
  statusSuccessSoft: "#dcfce7",
  statusSuccessBrandTint: "#e9fde0",
  statusWarning: "#d97706",
  statusWarningSoft: "#fef3c7",
  statusDanger: "#dc2626",
  statusDangerSoft: "#fee2e2",
} as const;

// ── Allocation palette (PDF / light print only) ───────────────────────────
// Web UI strokes: `ALLOCATION_STROKE` in `src/lib/allocation-colors.ts`
// (dark Cockpit: accent-strong, accent-soft, surface-3 — not these hex).
export const CT_ALLOCATION = {
  mining: CT_PDF.textPrimary, // mining = anchor / strongest ink
  usdc_base: CT_PDF.textMuted,
  btc_tactical: CT_PRODUCT_CONNECT_HEX,
  stable_reserve: CT_PDF.borderStrong,
} as const;

