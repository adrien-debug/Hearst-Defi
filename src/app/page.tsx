// `/` — S0 Landing: marketing teaser (left) + email/password sign-in (right).
//
// Design lock:
//   - Cockpit tokens only; accent = --ct-accent (#A7FB90); dark background.
//   - Glassmorphism surfaces only. No new tokens, no hex.
// Non-negotiables:
//   - APY as range (#1): "8–15%"
//   - Track record described as attested metrics, not promises (#5).
//   - "not guaranteed" disclaimer visible (#10).

import { Suspense } from "react";

import { LoginPanel } from "@/components/auth/login-panel";
import { MarketingPanel } from "@/components/auth/marketing-panel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hearst Connect — Institutional Yield Backed by Bitcoin Mining",
  description:
    "Hearst Yield Vault: mining-backed structured yield, monthly USDC distributions, target APY 8–15%. Accredited investors only.",
};

export default function LandingPage() {
  return (
    <div
      style={{
        height: "100dvh",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        background: "var(--ct-bg-deep)",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", borderRadius: "50%",
          width: "70vw", height: "70vw",
          top: "50%", left: "50%",
          transform: "translate(-50%, -60%)",
          background: "var(--ct-accent)", filter: "blur(180px)", opacity: 0.06,
        }} />
      </div>

      <div
        className="flex flex-col items-center justify-center min-h-screen relative px-6 py-20"
        style={{ zIndex: 1 }}
      >
        <div
          className="w-full max-w-5xl flex flex-col items-center"
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-2 w-full relative"
            style={{ 
              background: "color-mix(in srgb, var(--ct-surface-1) 20%, transparent)",
              backdropFilter: "blur(24px)",
              borderRadius: "var(--ct-radius-2xl)",
              border: "1px solid color-mix(in srgb, var(--ct-border-soft) 50%, transparent)",
              boxShadow: "0 20px 50px color-mix(in srgb, var(--ct-bg-deep) 80%, black)",
              overflow: "hidden",
              backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--ct-accent) 8%, transparent) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          >
            {/* ── Left: marketing teaser ── */}
            <section
              className="relative flex flex-col items-center justify-center p-12 lg:p-16"
              aria-label="Hearst Yield Vault — product overview"
            >
              <MarketingPanel />
            </section>

            {/* ── Right: sign-in panel ── */}
            <section
              className="flex flex-col items-center justify-center p-12 lg:p-16 relative"
              aria-label="Investor sign-in"
            >
              {/* Vertical Divider Gradient */}
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-3/4 hidden lg:block"
                style={{
                  background: "linear-gradient(to bottom, transparent, var(--ct-border-soft), transparent)"
                }}
              />
              
              <Suspense fallback={null}>
                <LoginPanel />
              </Suspense>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
