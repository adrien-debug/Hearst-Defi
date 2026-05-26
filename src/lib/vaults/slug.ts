// src/lib/vaults/slug.ts
//
// Pure helper functions for vault URL slugs and display labels.
// No I/O, no DB, no server-only — safe to import from client components,
// engine code, and tests alike.

import type { VaultRef } from "@/lib/vaults/types";

/**
 * URL-safe slug for any {@link VaultRef}. Fixtures use their `VaultId` (already
 * URL-safe: yield / defensive / btc-plus). Deployments use the lowercased
 * ticker (the wizard enforces `^[A-Z0-9-]{3,12}$` — see vaults/actions.ts).
 */
export function vaultSlug(ref: VaultRef): string {
  return ref.kind === "fixture"
    ? ref.fixture.id
    : ref.deployment.ticker.toLowerCase();
}

/** Display label for any {@link VaultRef}. */
export function vaultLabel(ref: VaultRef): string {
  return ref.kind === "fixture" ? ref.fixture.label : ref.deployment.name;
}
