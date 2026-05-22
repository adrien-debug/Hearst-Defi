import Image from "next/image";

import { LoginPanel } from "@/components/auth/login-panel";
import { AmbientLights } from "@/components/ambient-lights";

const WHY = [
  { title: "Real infrastructure", detail: "Mining operations" },
  { title: "Monthly distributions", detail: "USDC yield" },
  { title: "On-chain proof", detail: "Verified reserves" },
] as const;

export function LoginSplit() {
  return (
    <div className="ct-page-area min-h-dvh relative">
      <AmbientLights />
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2 relative z-[var(--ct-z-raised)]">
      {/* ── Left: product hero ───────────────────────────────────────────── */}
      <section className="relative flex flex-col justify-center overflow-hidden px-8 py-16 sm:px-12 lg:px-16">
        <div className="relative z-[var(--ct-z-raised)] mx-auto flex w-full max-w-md flex-col gap-10">
          <Image
            src="/logos/hearst-connect.svg"
            alt="Hearst Connect"
            width={791}
            height={268}
            className="h-9 w-auto self-start"
            priority
          />

          <div className="flex flex-col gap-5">
            <h1 className="h1 text-balance">
              Institutional
              <br />
              <span className="text-[--ct-text-strong]">Mining Yield</span>
              <br />
              Vaults
            </h1>
            <p className="body-lg ct-text-muted max-w-sm text-pretty">
              Mining-backed structured yield, on-chain. Monthly USDC
              distributions, target APY range 8–15%. Transparent, attested,
              institutional-grade.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <span className="eyebrow">Why Hearst</span>
            <ul className="flex flex-col divide-y divide-[--ct-border-soft] border-y border-[--ct-border-soft]">
              {WHY.map((row) => (
                <li
                  key={row.title}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <span className="body-sm font-medium text-[--ct-text-primary]">
                    {row.title}
                  </span>
                  <span className="body-sm ct-text-muted">{row.detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["Audited", "Base", "Institutional"].map((tag) => (
              <span key={tag} className="ct-pill">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Right: sign-in panel ─────────────────────────────────────────── */}
      <section 
        className="relative flex items-center justify-center border-t border-[--ct-border-soft] px-8 py-16 sm:px-12 lg:border-t-0 lg:border-l"
        style={{ 
          background: "color-mix(in srgb, var(--ct-surface-1) 40%, transparent)", 
          backdropFilter: "blur(24px)", 
          WebkitBackdropFilter: "blur(24px)" 
        }}
      >
        <div className="relative z-[var(--ct-z-raised)] flex w-full justify-center">
          <LoginPanel />
        </div>
      </section>
      </div>
    </div>
  );
}
