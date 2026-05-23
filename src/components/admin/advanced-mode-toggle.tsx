import Link from "next/link";

import { cn } from "@/lib/cn";

interface AdvancedModeToggleProps {
  /** Active mode resolved from the `?mode=` query param on the server. */
  active: "simple" | "advanced";
}

/**
 * Simple / Advanced segmented switch for the dashboard. Pure server component:
 * no client state, just two anchored links that bind the active mode to the
 * `mode` query param. Reuses the existing `.ct-seg-track` / `.ct-seg-btn` DS
 * classes (same as `/admin/signals`).
 */
export function AdvancedModeToggle({ active }: AdvancedModeToggleProps) {
  return (
    <nav
      className="inline-flex gap-1 ct-seg-track"
      aria-label="Dashboard mode"
    >
      <Link
        href="/admin/dashboard"
        className={cn("ct-seg-btn", active === "simple" && "active")}
        aria-current={active === "simple" ? "page" : undefined}
      >
        Simple
      </Link>
      <Link
        href="/admin/dashboard?mode=advanced"
        className={cn("ct-seg-btn", active === "advanced" && "active")}
        aria-current={active === "advanced" ? "page" : undefined}
      >
        Advanced
      </Link>
    </nav>
  );
}
