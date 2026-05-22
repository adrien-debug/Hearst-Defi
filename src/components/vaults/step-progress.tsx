import { cn } from "@/lib/cn";

type StepId = "select" | "product" | "deposit" | "confirmed";

const STEPS: { id: StepId; label: string; index: number }[] = [
  { id: "select", label: "Select", index: 1 },
  { id: "product", label: "Details", index: 2 },
  { id: "deposit", label: "Deposit", index: 3 },
  { id: "confirmed", label: "Confirmed", index: 4 },
];

interface StepProgressProps {
  active: StepId;
}

/**
 * 4-step wizard progress bar for the Invest flow.
 * Server Component — no interactivity, pure display.
 */
export function StepProgress({ active }: StepProgressProps) {
  const activeIndex = STEPS.find((s) => s.id === active)?.index ?? 1;

  return (
    <nav
      aria-label="Invest flow progress"
      className="flex items-center gap-0 w-full"
    >
      {STEPS.map((step, i) => {
        const isDone = step.index < activeIndex;
        const isActive = step.id === active;
        const isLast = i === STEPS.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            {/* Step segment */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              {/* Circle */}
              <span
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold border transition-colors",
                  isDone && "border-[var(--ct-border-accent)] bg-[var(--ct-accent)]",
                  isDone && "ct-text-strong",
                  isActive &&
                    "border-[var(--ct-border-accent)] bg-[var(--ct-accent-soft)] text-[var(--ct-accent)] shadow-[var(--ct-glow-subtle)]",
                  !isDone && !isActive && "border-[var(--ct-border-soft)] ct-surface-1",
                  !isDone && !isActive && "ct-text-muted",
                )}
              >
                {isDone ? (
                  // Checkmark for completed steps
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.index
                )}
              </span>
              {/* Label */}
              <span
                className={cn(
                  "eyebrow font-medium whitespace-nowrap",
                  isActive
                    ? "ct-text-strong"
                    : isDone
                      ? "ct-text-primary"
                      : "ct-text-muted",
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line (skip after last) */}
            {!isLast && (
              <div
                aria-hidden="true"
                className={cn(
                  "flex-1 h-px mx-2 rounded-full transition-colors",
                  isDone
                    ? "bg-[var(--ct-accent)]"
                    : "bg-[var(--ct-border-soft)]",
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
