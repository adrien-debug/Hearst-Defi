"use client";

import { cn } from "@/lib/cn";
import type { Preset } from "@/lib/engine/types";

interface PresetMeta {
  id: Preset;
  label: string;
  description: string;
  stressLevel: "neutral" | "mild" | "moderate" | "severe";
}

const PRESETS: PresetMeta[] = [
  {
    id: "base",
    label: "Base Case",
    description: "Current conditions ±0",
    stressLevel: "neutral",
  },
  {
    id: "btc_bear",
    label: "BTC Bear",
    description: "BTC −40%, hashprice −30%, energy +5%",
    stressLevel: "mild",
  },
  {
    id: "btc_bull",
    label: "BTC Bull",
    description: "BTC +60%, hashprice +20%, vol high",
    stressLevel: "mild",
  },
  {
    id: "mining_compression",
    label: "Mining Compression",
    description: "Difficulty +30%, hashprice −25%, energy +15%",
    stressLevel: "moderate",
  },
  {
    id: "extreme_stress",
    label: "Extreme Stress",
    description: "BTC −50%, hashprice −40%, DeFi shock",
    stressLevel: "severe",
  },
];

interface PresetBarProps {
  selected: Preset | null;
  onSelect: (preset: Preset) => void;
  disabled?: boolean;
}

export function PresetBar({ selected, onSelect, disabled }: PresetBarProps) {
  return (
    <nav
      aria-label="Scenario presets"
      className="flex flex-wrap gap-2"
    >
      {PRESETS.map((p) => {
        const isActive = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(p.id)}
            title={p.description}
            aria-pressed={isActive}
            className={cn(
              "rounded-[--radius-full] border px-4 py-2 text-sm font-semibold",
              "transition-[background-color,color,border-color,box-shadow] duration-150",
              "disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-brand] focus-visible:ring-offset-2 focus-visible:ring-offset-[--color-bg]",
              isActive
                ? [
                    "border-[--color-brand] bg-[--color-brand] text-[--color-brand-fg]",
                    "shadow-[0_0_0_3px_var(--color-accent-glow)]",
                  ]
                : [
                    "border-[--color-border-strong] bg-[--color-bg-elevated]",
                    "text-[--color-text-muted]",
                    "hover:border-[--color-border-strong] hover:bg-[--color-bg-tertiary] hover:text-[--color-text]",
                  ],
            )}
          >
            {p.label}
          </button>
        );
      })}
    </nav>
  );
}

export { PRESETS };
