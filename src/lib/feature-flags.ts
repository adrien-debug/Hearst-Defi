/**
 * Feature flags — evaluated at module load time from env vars.
 * All NEXT_PUBLIC_ vars are inlined at build time by Next.js; server-side-only
 * vars (without NEXT_PUBLIC_) are evaluated at runtime on the server.
 *
 * To enable a flag locally: set it in .env.local before starting the dev server.
 * To enable in production: add the var to your Vercel / Railway project env.
 */
export const FEATURE_FLAGS = {
  /**
   * ENABLE_MONTE_CARLO — gates the Monte Carlo panel in Scenario Lab.
   *
   * OFF by default. Set NEXT_PUBLIC_ENABLE_MONTE_CARLO=true to enable.
   * Requires Methodology v2.0 (ADR-006). Headline APY stays a range (#1).
   */
  ENABLE_MONTE_CARLO:
    process.env.NEXT_PUBLIC_ENABLE_MONTE_CARLO === "true",
} as const;
