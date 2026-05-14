"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import {
  parseFilter,
  type FilterValue,
} from "@/components/proof/proof-filter-types";
import { cn } from "@/lib/cn";

const OPTIONS: ReadonlyArray<{ value: FilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "mining_attestation", label: "Mining" },
  { value: "custody", label: "Custody" },
  { value: "audit", label: "Audit" },
  { value: "methodology", label: "Methodology" },
];

const URL_OUT: Record<FilterValue, string | null> = {
  all: null,
  mining_attestation: "mining",
  custody: "custody",
  audit: "audit",
  methodology: "methodology",
};

export function ProofFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = parseFilter(searchParams.get("type"));

  function select(value: FilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    const out = URL_OUT[value];
    if (out === null) params.delete("type");
    else params.set("type", out);
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <nav aria-label="Proof type filter" className="flex flex-wrap gap-2">
      {OPTIONS.map((opt) => {
        const isActive = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={isPending}
            onClick={() => select(opt.value)}
            aria-pressed={isActive}
            className={cn(
              "rounded-[--radius-button] border px-3.5 py-1.5 text-sm font-medium",
              "transition-[background-color,color,border-color] duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-bg]",
              isActive
                ? "border-[--color-brand] bg-[--color-brand] text-[--color-brand-fg]"
                : "border-[--color-border-strong] bg-transparent text-[--color-text-muted] hover:text-[--color-text]",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </nav>
  );
}
