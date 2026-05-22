// Spinner — small inline loading indicator for the Scenario Lab. No state.

import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("h-4 w-4 animate-spin", className)}>
      <div className="h-full w-full rounded-full border-2 border-current border-t-transparent" />
    </div>
  );
}
