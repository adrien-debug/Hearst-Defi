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
        className="grid grid-cols-1 lg:grid-cols-2 relative"
        style={{ minHeight: "100dvh", zIndex: 1 }}
      >
        {/* ── Left: marketing teaser ── */}
        <section
          className="relative flex items-start justify-center px-12 lg:px-20"
          style={{
            paddingTop: "calc(50dvh - 300px)",
            backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--ct-accent) 18%, transparent) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
          aria-label="Hearst Yield Vault — product overview"
        >
          <MarketingPanel />
        </section>

        {/* ── Right: sign-in panel ── */}
        <section
          className="flex items-start justify-center px-8 sm:px-12"
          style={{
            borderLeft: "1px solid var(--ct-border-soft)",
            paddingTop: "calc(50dvh - 240px)",
          }}
          aria-label="Investor sign-in"
        >
          <div className="flex w-full justify-center">
            <Suspense fallback={null}>
              <LoginPanel />
            </Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
