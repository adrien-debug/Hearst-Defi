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
export const CT_ACCENT_HEX = "#8A1538" as const;
export const CT_ACCENT_STRONG_HEX = "#A03B57" as const; // ≈ accent 78% + white 22%

// Connect product chip (CockpitShell registry) — green identity tag for the
// "Hearst Connect" launcher tile. Distinct from the Cockpit chrome accent.
export const CT_PRODUCT_CONNECT_HEX = "#A7FB90" as const;

// ── Cockpit chrome base (dark) — minimal hex mirror for surfaces that
//    cannot rely on the global CSS (Next.js standalone error pages, etc.) ──
export const CT_CHROME = {
  bgDeep: "#1A050B", // mirror of --ct-bg-deep
  textPrimary: "#ededed", // approx mirror of --ct-text-primary (light on dark)
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
  //  web (dark UI, glow over dark surface)   PDF (light print on white)
  //  --ct-status-success: #4ade80    ←→     statusSuccess: #16a34a
  //  --ct-status-warning: #fbbf24    ←→     statusWarning: #d97706
  //  --ct-status-danger:  #f87171    ←→     statusDanger:  #dc2626
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

// ── Allocation palette (used by PDF + dashboard charts) ────────────────────
// Keep these as semantic role colours, not raw hex anywhere else in the code.
export const CT_ALLOCATION = {
  mining: CT_PDF.textPrimary, // mining = anchor / strongest ink
  usdc_base: CT_PDF.textMuted,
  btc_tactical: CT_PRODUCT_CONNECT_HEX,
  stable_reserve: CT_PDF.borderStrong,
} as const;

