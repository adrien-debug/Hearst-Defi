"use client";

import { useCallback, useState, useTransition } from "react";

import {
  getPresetInputsAction,
  runScenarioAction,
} from "@/app/(product)/scenario-lab/actions";
import { InputsPanel } from "@/components/scenario/inputs-panel";
import { OutputPanel } from "@/components/scenario/output-panel";
import { PresetBar } from "@/components/scenario/preset-bar";
import { cn } from "@/lib/cn";
import type { Preset, ScenarioInputs, ScenarioOutput } from "@/lib/engine/types";

const BASE_INPUTS: ScenarioInputs = {
  btc_price_change_pct: 0,
  hashprice_usd_th_day: 0.085,
  energy_cost_kwh: 0.045,
  stable_apy_pct: 4.5,
  vol_index: 2,
};

interface LabShellState {
  selectedPreset: Preset | null;
  inputs: ScenarioInputs;
  output: ScenarioOutput | null;
}

export function LabShell() {
  const [state, setState] = useState<LabShellState>({
    selectedPreset: null,
    inputs: BASE_INPUTS,
    output: null,
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback((inputs: ScenarioInputs) => {
    setError(null);
    startTransition(async () => {
      try {
        const output = await runScenarioAction(inputs);
        setState((prev) => ({ ...prev, inputs, output }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }, []);

  function handlePresetSelect(preset: Preset) {
    setError(null);
    startTransition(async () => {
      try {
        const inputs = await getPresetInputsAction(preset);
        const output = await runScenarioAction(inputs);
        setState({ selectedPreset: preset, inputs, output });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }

  function handleInputChange(inputs: ScenarioInputs) {
    setState((prev) => ({ ...prev, selectedPreset: null, inputs }));
  }

  return (
    <div className="space-y-6">
      <PresetBar
        selected={state.selectedPreset}
        onSelect={handlePresetSelect}
        disabled={isPending}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        {/* Left: inputs */}
        <div className="space-y-6">
          <div className="rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card] p-5">
            <h2 className="stat-label mb-5">Inputs</h2>
            <InputsPanel
              inputs={state.inputs}
              onChange={handleInputChange}
              disabled={isPending}
            />
            <div className="mt-6">
              <button
                type="button"
                onClick={() => submit(state.inputs)}
                disabled={isPending}
                className={cn(
                  "w-full rounded-[--radius-button] border px-4 py-2.5 text-sm font-medium",
                  "transition-[background-color,color,border-color,opacity] duration-150",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  "border-[--color-brand] bg-[--color-brand] text-[--color-brand-fg]",
                  "hover:bg-[--color-brand-strong] hover:border-[--color-brand-strong]",
                )}
              >
                {isPending ? "Computing…" : "Run scenario"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: output */}
        <div className="min-w-0">
          {error && (
            <p className="mb-4 rounded-[--radius-button] border border-[--color-danger] bg-[oklch(0.24_0.10_25)] px-4 py-2.5 text-sm text-[--color-danger]">
              {error}
            </p>
          )}
          {state.output ? (
            <OutputPanel output={state.output} isPending={isPending} />
          ) : (
            <div
              className={cn(
                "flex h-64 items-center justify-center rounded-[--radius-card] border border-dashed border-[--color-border-subtle] text-center",
                isPending && "opacity-50",
              )}
            >
              {isPending ? (
                <p className="stat-label">Computing…</p>
              ) : (
                <p className="max-w-xs text-sm text-[--color-text-dim]">
                  Select a preset or adjust the sliders, then press{" "}
                  <span className="text-[--color-text-muted]">Run scenario</span>.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
