// src/components/admin/vault-breadcrumb.tsx
//
// Sticky admin breadcrumb — shows current vault scope and a switcher.
// Server Component: props are fully resolved on the server; the switcher
// (popover) is a separate "use client" sub-component.

import { cn } from "@/lib/cn";
import { vaultSlug } from "@/lib/vaults/slug";
import type { VaultRef } from "@/lib/vaults/types";
import {
  VaultSwitcherPopover,
  type VaultOption,
} from "@/components/admin/vault-switcher-popover";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VaultBreadcrumbProps {
  /** Pre-built segments returned by buildBreadcrumbSegments. */
  segments: string[];
  /** Currently scoped vault — undefined when no vault in scope. */
  currentVault?: VaultRef | null;
  /** Full vault catalog for the switcher popover. */
  allVaults: VaultRef[];
}

// ---------------------------------------------------------------------------
// ChevronRight separator
// ---------------------------------------------------------------------------

function ChevronRight() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      className="shrink-0"
    >
      <path
        d="M4 2L8 6L4 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// VaultBreadcrumb
// ---------------------------------------------------------------------------

/**
 * Sticky breadcrumb for the admin area. Renders breadcrumb segments and, when
 * a vault is in scope, a switcher popover (▾ chevron).
 *
 * A11y: `<nav aria-label="Breadcrumb">` wrapping `<ol>` with individual `<li>`.
 */
export function VaultBreadcrumb({
  segments,
  currentVault,
  allVaults,
}: VaultBreadcrumbProps) {
  // Map VaultRef[] to the plain VaultOption[] shape the client component expects
  const options: VaultOption[] = allVaults.map((ref) => ({
    id: vaultSlug(ref),
    label: ref.kind === "fixture" ? ref.fixture.label : ref.deployment.name,
    ticker:
      ref.kind === "fixture" ? ref.fixture.ticker : ref.deployment.ticker,
  }));

  const currentId = currentVault ? vaultSlug(currentVault) : null;

  // Index of the vault label in the segments array (to position the switcher)
  const vaultSegmentIndex = currentVault
    ? segments.findIndex((s) =>
        s ===
        (currentVault.kind === "fixture"
          ? currentVault.fixture.label
          : currentVault.deployment.name),
      )
    : -1;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "sticky top-0 z-[var(--ct-z-dropdown)]",
        "flex items-center gap-1.5 px-6 py-2",
        "border-b border-[var(--ct-border-soft)]",
        "bg-[var(--ct-bg-deep)]",
      )}
    >
      <ol className="flex items-center gap-1.5 text-sm" role="list">
        {segments.map((segment, idx) => {
          const isLast = idx === segments.length - 1;
          const isVaultSegment = idx === vaultSegmentIndex;

          return (
            <li key={`${segment}-${idx}`} className="flex items-center gap-1.5">
              {/* Separator (not before first item) */}
              {idx > 0 && (
                <span className="text-[var(--ct-text-faint)]" aria-hidden="true">
                  <ChevronRight />
                </span>
              )}

              {/* Segment text */}
              <span
                className={cn(
                  "leading-none",
                  isLast
                    ? "font-medium text-[var(--ct-text-primary)]"
                    : "text-[var(--ct-text-faint)]",
                  isVaultSegment && "mono",
                )}
              >
                {segment}
              </span>

              {/* Vault switcher popover — only on vault segment */}
              {isVaultSegment && (
                <VaultSwitcherPopover
                  currentId={currentId}
                  options={options}
                  // Default onSelect handled inside the component (router.push)
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
