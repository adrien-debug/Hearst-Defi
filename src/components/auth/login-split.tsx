import Image from "next/image";

import { LoginPanel } from "@/components/auth/login-panel";

export function LoginSplit() {
  return (
    <div
      className="relative !p-0"
      style={{
        height: "100dvh",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
        background: "var(--ct-bg-deep)",
      }}
    >
      {/* Centered ambient glow */}
      <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", borderRadius: "50%",
          width: "70vw", height: "70vw",
          top: "50%", left: "50%",
          transform: "translate(-50%, -60%)",
          background: "var(--ct-accent)", filter: "blur(180px)", opacity: 0.06,
        }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 relative" style={{ height: "100%", zIndex: 1 }}>

        {/* ── Left: brand + tagline ── */}
        <section
          className="relative flex items-start justify-center px-12 lg:px-20"
          style={{
            height: "100%",
            paddingTop: "calc(50dvh - 240px)",
            backgroundImage: "radial-gradient(circle, color-mix(in srgb, var(--ct-accent) 18%, transparent) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          <div
            className="flex flex-col items-center"
            style={{ gap: "3rem", textAlign: "center", maxWidth: "560px" }}
          >
            {/* Logo */}
            <Image
              src="/logos/hearst-connect-dark.svg"
              alt="Hearst Connect"
              width={831}
              height={294}
              style={{ width: "440px", height: "auto", display: "block" }}
              priority
            />

            {/* Tagline */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.25rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--ct-accent)",
                  opacity: 0.7,
                  fontWeight: 500,
                }}
              >
                Real-World Asset Yield
              </span>

              <h1
                style={{
                  fontSize: "clamp(1.5rem, 2.2vw, 2rem)",
                  fontWeight: 600,
                  lineHeight: 1.2,
                  letterSpacing: "-0.02em",
                  color: "var(--ct-text-primary)",
                  maxWidth: "22ch",
                }}
              >
                Institutional yield, backed by{" "}
                <span style={{ color: "var(--ct-accent)" }}>Bitcoin mining</span>
              </h1>

              {/* APY chip */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  border: "1px solid color-mix(in srgb, var(--ct-accent) 22%, var(--ct-border-soft))",
                  background: "color-mix(in srgb, var(--ct-accent) 6%, transparent)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  style={{
                    width: "6px", height: "6px", borderRadius: "50%",
                    background: "var(--ct-accent)",
                    boxShadow: "0 0 8px var(--ct-accent)",
                  }}
                />
                <span style={{
                  fontSize: "0.75rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ct-text-muted)",
                }}>
                  Target APY
                </span>
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "var(--ct-text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}>
                  8–15%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right: sign-in panel ── */}
        <section
          className="flex items-start justify-center px-8 sm:px-12"
          style={{
            borderLeft: "1px solid var(--ct-border-soft)",
            height: "100%",
            paddingTop: "calc(50dvh - 240px)",
          }}
        >
          <div className="flex w-full justify-center">
            <LoginPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
