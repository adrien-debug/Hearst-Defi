"use client";

import { cn } from "@/lib/cn";
import type { Preset } from "@/lib/engine/types";

interface PresetMeta {
  id: Preset;
  label: string;
  description: string;
}

const PRESETS: PresetMeta[] = [
  { id: "base", label: "Base Case", description: "Current conditions ±0" },
  {
    id: "btc_bear",
    label: "BTC Bear",
    description: "BTC −40%, hashprice −30%, energy +5%",
  },
  {
    id: "btc_bull",
    label: "BTC Bull",
    description: "BTC +60%, hashprice +20%, vol high",
  },
  {
    id: "mining_compression",
    label: "Mining Compression",
    description: "Difficulty +30%, hashprice −25%, energy +15%",
  },
  {
    id: "extreme_stress",
    label: "Extreme Stress",
    description: "BTC −50%, hashprice −40%, DeFi shock",
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
              "rounded-[--radius-button] border px-3.5 py-1.5 text-sm font-medium",
              "transition-[background-color,color,border-color] duration-[150ms]",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isActive
                ? "border-[--color-brand] bg-[--color-brand] text-[--color-brand-fg]"
                : "border-[--color-border-strong] bg-transparent text-[--color-text-muted] hover:border-[--color-border-strong] hover:text-[--color-text]",
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
