"use client";

import { useTransition } from "react";

import { toggleDemoMode } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";

interface DemoModeToggleProps {
  /** Current demo-mode state — passed from a parent Server Component. */
  active: boolean;
}

/**
 * Client toggle that flips the demo-mode cookie via Server Action.
 *
 * - Pure UI shim around the action — no fetch, no useEffect, no local state.
 * - Uses the locked `Button` primitive (`variant="ghost"`, `size="sm"`) so
 *   the verrou DS stays green (no new primitives, no new tokens).
 * - Visibility decision is made by the *parent* component, not here.
 */
export function DemoModeToggle({ active }: DemoModeToggleProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={active}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleDemoMode();
        })
      }
    >
      {active ? "Exit demo mode" : "Enter demo mode"}
    </Button>
  );
}
