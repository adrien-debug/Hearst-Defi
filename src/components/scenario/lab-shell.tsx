"use client";

import { useCallback, useState, useTransition } from "react";

import {
  getPresetInputsAction,
  runScenarioAction,
} from "@/app/(product)/scenario-lab/actions";
import { InputsPanel } from "@/components/scenario/inputs-panel";
import { OutputPanel } from "@/components/scenario/output-panel";
import { PresetBar } from "@/components/scenario/preset-bar";
import { Button } from "@/components/ui/button";
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
      {/* Preset bar */}
      <PresetBar
        selected={state.selectedPreset}
        onSelect={handlePresetSelect}
        disabled={isPending}
      />

      {/* Error banner */}
      {error && (
        <p className="rounded-[--radius-button] border border-[--color-danger] bg-[--color-danger-bg] px-4 py-2.5 text-sm text-[--color-danger]">
          {error}
        </p>
      )}

      {/* Main 2-column layout */}
      <div className="grid gap-8 lg:grid-cols-[minmax(360px,420px)_1fr]">

        {/* ── Left: Inputs panel ──────────────────────────────────────── */}
        <div className="flex flex-col gap-0 rounded-[--radius-card] border border-[--color-border] bg-[--color-bg-card]">
          {/* Panel header */}
          <div className="border-b border-[--color-border-subtle] px-6 py-4">
            <h2 className="h4">Inputs</h2>
            <p className="mt-0.5 text-xs text-[--color-text-dim]">
              Adjust sliders or select a preset above
            </p>
          </div>

          {/* Sliders */}
          <div
            className={cn(
              "flex-1 px-6 py-5",
              isPending && "pointer-events-none opacity-50",
            )}
          >
            <InputsPanel
              inputs={state.inputs}
              onChange={handleInputChange}
              disabled={isPending}
            />
          </div>

          {/* Run button — pinned to bottom */}
          <div className="border-t border-[--color-border-subtle] px-6 py-5">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              onClick={() => submit(state.inputs)}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run scenario
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: Output panel ─────────────────────────────────────── */}
        <div className="min-w-0">
          {state.output ? (
            <OutputPanel output={state.output} isPending={isPending} />
          ) : (
            <div
              className={cn(
                "flex min-h-80 flex-col items-center justify-center gap-3",
                "rounded-[--radius-card] border border-dashed border-[--color-border-subtle]",
                "transition-opacity duration-150",
                isPending && "opacity-50",
              )}
            >
              {isPending ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin text-[--color-brand]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="stat-label">Computing…</p>
                </>
              ) : (
                <>
                  <svg
                    className="h-8 w-8 text-[--color-text-dim]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                  <p className="max-w-xs text-center text-sm text-[--color-text-dim]">
                    Select a preset above or adjust the sliders,{" "}
                    <br />
                    then press{" "}
                    <span className="font-semibold text-[--color-text-muted]">
                      Run scenario
                    </span>{" "}
                    to see projections.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
