"use client";

import { cn } from "@/lib/cn";
import type { ScenarioInputs } from "@/lib/engine/types";

interface SliderFieldMeta {
  key: keyof ScenarioInputs;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}

const FIELDS: SliderFieldMeta[] = [
  {
    key: "btc_price_change_pct",
    label: "BTC price change",
    unit: "%",
    min: -60,
    max: 120,
    step: 1,
    format: (v) => `${v >= 0 ? "+" : ""}${v}%`,
  },
  {
    key: "hashprice_usd_th_day",
    label: "Hashprice",
    unit: "$/TH/day",
    min: 0.02,
    max: 0.15,
    step: 0.001,
    format: (v) => `$${v.toFixed(3)}`,
  },
  {
    key: "energy_cost_kwh",
    label: "Energy cost",
    unit: "$/kWh",
    min: 0.02,
    max: 0.12,
    step: 0.001,
    format: (v) => `$${v.toFixed(3)}`,
  },
  {
    key: "stable_apy_pct",
    label: "Stable base APY",
    unit: "%",
    min: 1,
    max: 8,
    step: 0.1,
    format: (v) => `${v.toFixed(1)}%`,
  },
  {
    key: "vol_index",
    label: "BTC volatility (30d)",
    unit: "index",
    min: 1,
    max: 4,
    step: 0.05,
    format: (v) =>
      v < 1.75 ? "Low" : v < 2.5 ? "Normal" : v < 3.25 ? "High" : "Extreme",
  },
];

interface InputsPanelProps {
  inputs: ScenarioInputs;
  onChange: (updated: ScenarioInputs) => void;
  disabled?: boolean;
}

export function InputsPanel({ inputs, onChange, disabled }: InputsPanelProps) {
  function handleChange(key: keyof ScenarioInputs, raw: string) {
    const v = parseFloat(raw);
    if (isNaN(v)) return;
    onChange({ ...inputs, [key]: v });
  }

  return (
    <div className="space-y-5">
      {FIELDS.map((field) => {
        const value = inputs[field.key];
        const pct =
          ((value - field.min) / (field.max - field.min)) * 100;

        return (
          <div key={field.key} className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={`slider-${field.key}`}
                className="stat-label"
              >
                {field.label}
              </label>
              <span
                className={cn(
                  "font-mono text-sm tabular-nums text-[--color-text]",
                  disabled && "opacity-50",
                )}
              >
                {field.format(value)}
                <span className="ml-1 text-[--color-text-dim]">
                  {field.unit}
                </span>
              </span>
            </div>
            <div className="relative flex items-center">
              <input
                id={`slider-${field.key}`}
                type="range"
                min={field.min}
                max={field.max}
                step={field.step}
                value={value}
                disabled={disabled}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className="slider-track w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                style={
                  {
                    "--slider-pct": `${pct}%`,
                  } as React.CSSProperties
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
