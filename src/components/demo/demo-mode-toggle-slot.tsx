import { isDemoMode } from "@/lib/demo";

import { DemoModeToggle } from "./demo-mode-toggle";

/**
 * Server-side gate around `<DemoModeToggle />`.
 *
 * Visibility rules (final):
 *   - Always rendered when `NODE_ENV !== "production"` (local dev + preview).
 *   - In production: only rendered when demo mode is **already active** (env
 *     var or pre-existing cookie). This gives Adrien a way to step out
 *     without baking an admin gate, while keeping the toggle invisible to
 *     ordinary prod users who never opt in.
 *
 * Rationale: the prompt left the visibility to my judgement. Showing the
 * toggle to anonymous prod visitors would be a footgun (someone could flip
 * a co-investor's view to demo mid-pitch); requiring admin auth would
 * couple this surface to the Privy gate. The "dev-always / prod only when
 * active" rule is the smallest knob that preserves both demo ergonomics
 * and prod cleanliness.
 */
export async function DemoModeToggleSlot() {
  // Env-locked dedicated /demo deployment — no exit expected from user.
  if (process.env.DEMO_MODE_DEFAULT === "1") return null;

  const active = await isDemoMode();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !active) return null;
  return <DemoModeToggle active={active} />;
}
