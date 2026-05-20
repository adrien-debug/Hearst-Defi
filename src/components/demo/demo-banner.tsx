import { isDemoMode } from "@/lib/demo";

/**
 * Sticky-ish strip rendered at the top of every page when demo mode is active.
 * Uses the locked `.ct-status-warning-bg` helper (verrou §5 / §2) — no new
 * tokens, no new classes.
 *
 * Server Component on purpose: keeps the demo signal SSR-rendered so a
 * screenshot or PDF export of any page already includes the indicator.
 */
export async function DemoBanner() {
  const active = await isDemoMode();
  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="Demo mode active"
      className="sticky top-0 z-[var(--ct-z-overlay)] ct-status-warning-bg flex items-center justify-center gap-3 px-4 py-2 text-center text-xs"
    >
      <span className="eyebrow">Demo mode</span>
      <span className="text-[--ct-text-body]">
        Showing simulated data. No live wallet activity. Numbers are illustrative.
      </span>
    </div>
  );
}
