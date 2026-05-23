import Link from "next/link";

import { cn } from "@/lib/cn";
import type { VaultId } from "@/lib/engine/types";

/** Vault catalog rendered by the selector. Order is stable across renders. */
const VAULT_OPTIONS: ReadonlyArray<{ id: VaultId; label: string }> = [
  { id: "yield", label: "Yield" },
  { id: "defensive", label: "Defensive" },
  { id: "btc-plus", label: "BTC Plus" },
];

export interface VaultSelectorProps {
  /** Currently active vault id (resolved from `?vault=` on the server). */
  active: VaultId;
  /** Base path to anchor links against — defaults to `/admin/dashboard`. */
  basePath?: string;
  /**
   * Extra query params to preserve when switching vaults. Lets the dashboard
   * keep `?mode=advanced` (and any other admin toggle) live across vault
   * changes. Empty strings / nullish values are dropped.
   */
  preserveParams?: Record<string, string | undefined>;
  /** ARIA label for the segmented control. */
  ariaLabel?: string;
}

/**
 * Multi-vault selector (ADR-006 #9). Pure Server Component — three anchored
 * links bound to `?vault=`. Reuses the existing `.ct-seg-track` / `.ct-seg-btn`
 * design-system primitives (same pattern as `AdvancedModeToggle`), so no new
 * tokens or classes are introduced.
 *
 * The selector NEVER mixes vault data — switching vaults navigates to a fresh
 * URL where the loader re-anchors all metadata on the chosen vault.
 */
export function VaultSelector({
  active,
  basePath = "/admin/dashboard",
  preserveParams,
  ariaLabel = "Vault selector",
}: VaultSelectorProps) {
  return (
    <nav className="inline-flex gap-1 ct-seg-track" aria-label={ariaLabel}>
      {VAULT_OPTIONS.map((opt) => {
        const params = new URLSearchParams();
        if (opt.id !== "yield") params.set("vault", opt.id);
        if (preserveParams) {
          for (const [key, value] of Object.entries(preserveParams)) {
            if (value !== undefined && value !== "") {
              params.set(key, value);
            }
          }
        }
        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        const isActive = opt.id === active;
        return (
          <Link
            key={opt.id}
            href={href}
            className={cn("ct-seg-btn", isActive && "active")}
            aria-current={isActive ? "page" : undefined}
          >
            {opt.label}
          </Link>
        );
      })}
    </nav>
  );
}
