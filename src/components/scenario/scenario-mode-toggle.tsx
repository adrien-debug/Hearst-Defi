"use client";

// ScenarioModeToggle — Single / Compare sub-tab toggle.
// Extracted from lab-shell.tsx. Behaviour preserved.

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type ScenarioMode = "single" | "compare";

interface ScenarioModeToggleProps {
  active: ScenarioMode;
  onChange: (mode: ScenarioMode) => void;
}

export function ScenarioModeToggle({
  active,
  onChange,
}: ScenarioModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Scenario mode"
      className="inline-flex gap-1 glass-panel-subtle p-1"
    >
      {(["single", "compare"] as ScenarioMode[]).map((mode) => {
        const isActive = active === mode;
        return (
          <Button
            key={mode}
            type="button"
            role="tab"
            id={`tab-mode-${mode}`}
            aria-controls={`tabpanel-mode-${mode}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            variant="ghost"
            size="sm"
            onClick={() => onChange(mode)}
            className={cn(
              "rounded-[var(--ct-radius-sm)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-none active:scale-100",
              isActive
                ? "bg-[var(--ct-text-strong)] text-[var(--ct-bg-deep)] hover:bg-[var(--ct-text-strong)] hover:text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-body)] hover:text-[var(--ct-text-primary)]",
            )}
          >
            {mode}
          </Button>
        );
      })}
    </div>
  );
}
