/**
 * MarketingPanel — left column of the S0 landing / login split-screen.
 *
 * Contains:
 *   - Logo
 *   - Tagline + APY range chip
 *   - Track record metrics (attested, not a forecast)
 *   - Link to Methodology v1.0
 *   - "Request access" CTA → /onboarding/accreditation
 *
 * Design-lock:
 *   - Cockpit tokens only; accent = --ct-accent; dark; glassmorphism.
 *   - No hex, no magic px outside of clamp().
 * Non-negotiables:
 *   - APY as range "8–15%" (#1)
 *   - Every metric has a provenance label (Attested) (#2)
 *   - "not guaranteed" disclaimer (#10)
 *   - No forbidden words: guarantee / promise / certain / will deliver / risk-free (#5)
 */

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Static attested track-record metrics. Updated manually by admin. */
const TRACK_RECORD = [
  { label: "Track-record length",    value: "18 mo",     provenance: "Attested" },
  { label: "Avg monthly distrib.",   value: "~0.85%",    provenance: "Attested" },
  { label: "Investors served",       value: "47",        provenance: "Manual" },
  { label: "Total AUM deployed",     value: "$24M+",     provenance: "Attested" },
] as const;

export function MarketingPanel() {
  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: "3rem", textAlign: "center", maxWidth: "560px", width: "100%" }}
    >
      {/* Logo */}
      <Image
        src="/logos/hearst-connect-dark.svg"
        alt="Hearst Connect"
        width={831}
        height={294}
        style={{ width: "380px", height: "auto", display: "block" }}
        priority
      />

      {/* Tagline block */}
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

        {/* APY chip — range, non-negotiable #1 */}
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
            fontWeight: 700,
            color: "var(--ct-text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}>
            8–15%
          </span>
        </div>
      </div>

      {/* Track-record grid — non-negotiable #2: each metric is provenance-labelled */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "0.75rem",
          width: "100%",
        }}
        aria-label="Attested track record metrics"
      >
        {TRACK_RECORD.map(({ label, value, provenance }) => (
          <div
            key={label}
            style={{
              padding: "0.875rem 1rem",
              borderRadius: "var(--ct-radius-md)",
              border: "1px solid var(--ct-border-soft)",
              background: "color-mix(in srgb, var(--ct-surface-1) 60%, transparent)",
              backdropFilter: "blur(8px)",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
            }}
          >
            {/* Value */}
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--ct-text-strong)",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
              }}
            >
              {value}
            </span>
            {/* Label */}
            <span style={{ fontSize: "0.6875rem", color: "var(--ct-text-muted)" }}>
              {label}
            </span>
            {/* Provenance badge — non-negotiable #2 */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.5625rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: provenance === "Attested" ? "var(--ct-status-info)" : "var(--ct-text-faint)",
                fontWeight: 500,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "4px", height: "4px", borderRadius: "50%",
                  background: "currentColor", display: "inline-block",
                }}
              />
              {provenance}
            </span>
          </div>
        ))}
      </div>

      {/* Methodology link + CTA */}
      <div
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.875rem", width: "100%" }}
      >
        <Button variant="primary" size="lg" asChild className="w-full font-bold" style={{ maxWidth: "320px" }}>
          <Link href="/onboarding/accreditation?step=accreditation">
            Request access
          </Link>
        </Button>

        <a
          href="/docs/methodology/v1.0.md"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.6875rem",
            color: "var(--ct-accent-strong)",
            textDecoration: "none",
            letterSpacing: "0.04em",
            opacity: 0.8,
            transition: "opacity 0.15s",
          }}
          className="hover:opacity-100"
        >
          Read Methodology v1.0 ↗
        </a>
      </div>

      {/* Non-negotiable #10 — disclaimer */}
      <p
        style={{
          fontSize: "0.625rem",
          color: "var(--ct-text-faint)",
          lineHeight: 1.7,
          maxWidth: "42ch",
          textAlign: "center",
        }}
      >
        Cayman SPV. Accredited investors only. $250k minimum. 60-day soft lock-up.
        APY range is a target projection based on stated assumptions — not a commitment of future returns.
      </p>
    </div>
  );
}
