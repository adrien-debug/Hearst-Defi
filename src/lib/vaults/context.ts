// src/lib/vaults/context.ts
//
// Server-side vault context helper. Resolves the "current vault" from the
// URL (?vault=<slug>) and/or the pathname (/admin/vaults/[id]).
// Returns a stable VaultContext for use in admin/layout.tsx and breadcrumb.

import "server-only";

import { listAllVaults, resolveVault } from "@/lib/vaults/resolver";
import type { VaultRef } from "@/lib/vaults/types";
import { vaultSlug } from "@/lib/vaults/slug";

export interface VaultContext {
  /** Currently scoped vault, or null when no vault is in the URL. */
  current: VaultRef | null;
  /** Full catalog for the switcher popover. */
  all: VaultRef[];
  /**
   * True when the page is explicitly scoped to a vault via:
   *   - `?vault=<slug>` query parameter, OR
   *   - `/admin/vaults/[id]` path segment.
   */
  isVaultScoped: boolean;
}

/** Extract the [id] segment from /admin/vaults/[id]/* paths. */
function extractVaultIdFromPath(pathname: string): string | null {
  const match = /^\/admin\/vaults\/([^/]+)/.exec(pathname);
  return match?.[1] ?? null;
}

/**
 * Resolves the current vault context from URL params and pathname.
 *
 * Resolution order:
 *   1. `?vault=` query parameter (slug / ticker / cuid)
 *   2. `/admin/vaults/[id]` path segment
 *   3. null (no vault scope)
 *
 * Always returns all vaults for the switcher (status = "any" so admin can
 * see drafts and paused vaults too).
 */
export async function getCurrentVaultContext(
  searchParams: { vault?: string },
  pathname: string,
): Promise<VaultContext> {
  const all = await listAllVaults({ status: "any" });

  // 1. ?vault= takes priority (explicit user selection)
  const querySlug = searchParams.vault?.trim();
  if (querySlug) {
    const current = await resolveVault(querySlug);
    return { current, all, isVaultScoped: true };
  }

  // 2. /admin/vaults/[id] path scope
  const pathId = extractVaultIdFromPath(pathname);
  if (pathId) {
    const current = await resolveVault(pathId);
    return { current, all, isVaultScoped: true };
  }

  // 3. No vault scope
  return { current: null, all, isVaultScoped: false };
}

/**
 * Builds breadcrumb segments from a pathname + current vault.
 *
 * Pure function — no I/O, no DB. Safe to call in tests without mocking.
 *
 * Segment rules:
 *   /admin                               → ["Admin"]
 *   /admin/vaults                        → ["Admin", "Vaults"]
 *   /admin/vaults/[id]                   → ["Admin", "Vaults", <VaultLabel>]
 *   /admin/dashboard?vault=hyv-a         → ["Admin", "Vaults", <VaultLabel>, "Dashboard"]
 *   /admin/distributions?vault=hyv-a     → ["Admin", "Vaults", <VaultLabel>, "Distributions"]
 *   /admin/signals (no vault)            → ["Admin", "Signals"]
 */
export function buildBreadcrumbSegments(
  pathname: string,
  currentVault: VaultRef | null,
): string[] {
  // Strip query string — pathname should be clean, but guard anyway.
  const clean = pathname.split("?")[0] ?? pathname;
  // Remove leading slash and split
  const parts = clean.replace(/^\//, "").split("/").filter(Boolean);
  // parts[0] = "admin", parts[1] = section, parts[2] = id ...

  const segments: string[] = ["Admin"];

  if (parts.length <= 1) {
    // Just /admin
    return segments;
  }

  const section = parts[1] ?? "";

  // Vault detail path: /admin/vaults/[id] — the [id] is not a page name
  if (section === "vaults") {
    segments.push("Vaults");
    if (currentVault) {
      const label = vaultLabel(currentVault);
      segments.push(label);
      // Sub-pages under /admin/vaults/[id]/* (e.g. /admin/vaults/[id]/edit)
      if (parts.length >= 4) {
        segments.push(capitalize(parts[3] ?? ""));
      }
    }
    return segments;
  }

  // Non-vault sections: if a vault is in scope (via ?vault=) inject vault breadcrumb
  if (currentVault) {
    segments.push("Vaults");
    segments.push(vaultLabel(currentVault));
  }

  segments.push(sectionLabel(section));

  return segments;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function vaultLabel(ref: VaultRef): string {
  return ref.kind === "fixture" ? ref.fixture.label : ref.deployment.name;
}

function sectionLabel(segment: string): string {
  // Convert kebab-case to Title Case
  return segment
    .split("-")
    .map(capitalize)
    .join(" ");
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Re-export for consumers that want to derive slugs from context
export { vaultSlug };
