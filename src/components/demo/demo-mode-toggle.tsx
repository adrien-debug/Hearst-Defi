"use client";

import { useTransition } from "react";

import { toggleDemoMode } from "@/app/actions/demo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

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
      className={cn(active && "bg-[--ct-accent-soft] text-[--ct-text-strong] border border-[--ct-border-accent]")}
      aria-pressed={active}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await toggleDemoMode();
        })
      }
    >
      Démo
    </Button>
  );
}
