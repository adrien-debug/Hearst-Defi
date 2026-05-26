"use client";

import { useMemo } from "react";

import { projectVaultApy, type VaultDraft } from "@/lib/engine/projection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ProjectionFooterProps {
  vaultDraft: VaultDraft;
}

// ---------------------------------------------------------------------------
// ProjectionFooter — sticky live-projection bar
// Recalculates on every vaultDraft change (pure memoised call).
// ---------------------------------------------------------------------------

export function ProjectionFooter({ vaultDraft }: ProjectionFooterProps) {
  const projection = useMemo(() => projectVaultApy(vaultDraft), [vaultDraft]);

  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 40,
        width: "100%",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "color-mix(in srgb, var(--ct-bg-deep) 55%, transparent)",
        borderTop: "1px solid var(--ct-border-soft)",
        padding: "16px 24px",
      }}
      aria-label="Live vault projection"
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px 24px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Label */}
        <span
          className="stat-label"
          style={{ color: "var(--ct-text-muted)", whiteSpace: "nowrap" }}
        >
          Projected APY range
        </span>

        {/* APY range — accent colour */}
        <span
          className="tabular font-semibold"
          style={{
            color: "var(--ct-accent)",
            fontSize: "1rem",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          {projection.apyRangeLabel}
        </span>

        <Separator />

        {/* Lockup */}
        <span className="body-sm ct-text-muted" style={{ whiteSpace: "nowrap" }}>
          Lockup:&nbsp;
          <span className="ct-text-primary font-medium">
            {projection.lockupDays}d
          </span>
        </span>

        <Separator />

        {/* M-of-N quorum */}
        <span className="body-sm ct-text-muted" style={{ whiteSpace: "nowrap" }}>
          M-of-N:&nbsp;
          <span className="ct-text-primary font-medium">{projection.quorum}</span>
        </span>

        {/* Spacer pushes disclaimer to the right on wide viewports */}
        <span style={{ flex: 1 }} />

        {/* Disclaimer */}
        <p
          className="body-xs"
          style={{
            color: "var(--ct-text-faint)",
            margin: 0,
            textAlign: "right",
          }}
        >
          Live estimate — not guaranteed. Final terms after deployment.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Separator helper
// ---------------------------------------------------------------------------

function Separator() {
  return (
    <span
      aria-hidden
      style={{
        width: 1,
        height: 14,
        background: "var(--ct-border-soft)",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
