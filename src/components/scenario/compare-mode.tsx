"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { runComparisonAction } from "@/app/admin/scenario-lab/actions";
import { DeltaRow } from "@/components/scenario/delta-row";
import { OutputPanel } from "@/components/scenario/output-panel";
import { PRESETS } from "@/components/scenario/preset-bar";
import { PresetPicker } from "@/components/ui/preset-picker";
import { cn } from "@/lib/cn";
import type { Preset, ScenarioOutput } from "@/lib/engine/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function labelFor(preset: Preset): string {
  return PRESETS.find((p) => p.id === preset)?.label ?? preset;
}

const PRESET_OPTIONS = PRESETS.map((p) => ({
  value: p.id,
  label: p.label,
  description: p.description,
}));

// ── Placeholder panel (empty / loading) ──────────────────────────────────────

interface PlaceholderProps {
  side: "A" | "B";
  pending: boolean;
}

function Placeholder({ side, pending }: PlaceholderProps) {
  return (
    <div
      className={cn(
        "flex min-h-80 flex-col items-center justify-center gap-3",
        "glass-panel-subtle border-dashed",
        "border-l-4",
        side === "A"
          ? "border-l-[var(--ct-border-strong)]"
          : "border-l-[var(--ct-text-strong)]",
        "px-5 py-5",
        "transition-opacity duration-[var(--ct-dur-fast)]",
        pending && "opacity-50",
      )}
      aria-live="polite"
    >
      {pending ? (
        <>
          <svg
            className="h-4 w-4 animate-spin text-[var(--ct-text-strong)]"
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
          <p className="stat-label text-[var(--ct-text-body)]">Computing…</p>
        </>
      ) : (
        <>
          <svg
            className="h-10 w-10 text-[var(--ct-text-muted)]"
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
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          <p className="text-center text-sm text-[var(--ct-text-muted)]">
            <span className="font-semibold text-[var(--ct-text-body)]">
              Scenario {side}
            </span>
            <br />
            Pick a preset to compare
          </p>
        </>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface ComparisonState {
  a: ScenarioOutput | null;
  b: ScenarioOutput | null;
}

export function CompareMode({ active = true }: { active?: boolean }) {
  const [presetA, setPresetA] = useState<Preset | null>("base");
  const [presetB, setPresetB] = useState<Preset | null>("extreme_stress");
  const [outputs, setOutputs] = useState<ComparisonState>({ a: null, b: null });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runComparison = useCallback((a: Preset, b: Preset) => {
    setError(null);
    startTransition(async () => {
      try {
        const [outA, outB] = await runComparisonAction([a, b]);
        setOutputs({ a: outA, b: outB });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }, []);

  // Auto-run on initial mount with the default pair. The refs capture the
  // initial preset values so the effect can be declared with a stable deps
  // array while still reading the correct starting state.
  const initialA = useRef(presetA);
  const initialB = useRef(presetB);
  const didRunInitial = useRef(false);
  useEffect(() => {
    if (!active) return;
    const a = initialA.current;
    const b = initialB.current;
    if (!didRunInitial.current && a && b && a !== b) {
      didRunInitial.current = true;
      runComparison(a, b);
    }
  }, [active, runComparison]);

  function handleSelectA(p: Preset) {
    // If the user picks the same preset that's on B, swap.
    const nextB = p === presetB ? presetA : presetB;
    setPresetA(p);
    setPresetB(nextB);
    if (nextB && p !== nextB) {
      runComparison(p, nextB);
    } else {
      setOutputs({ a: null, b: null });
    }
  }

  function handleSelectB(p: Preset) {
    const nextA = p === presetA ? presetB : presetA;
    setPresetB(p);
    setPresetA(nextA);
    if (nextA && p !== nextA) {
      runComparison(nextA, p);
    } else {
      setOutputs({ a: null, b: null });
    }
  }

  const showOutputs = outputs.a !== null && outputs.b !== null;

  return (
    <div className="space-y-6">
      {/* Selectors row */}
      <div className="grid gap-4 md:grid-cols-2">
        <PresetPicker
          side="A"
          value={presetA}
          options={PRESET_OPTIONS}
          excluded={presetB}
          disabled={pending}
          onChange={handleSelectA}
        />
        <PresetPicker
          side="B"
          value={presetB}
          options={PRESET_OPTIONS}
          excluded={presetA}
          disabled={pending}
          onChange={handleSelectB}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--ct-radius-full)] border border-[var(--ct-status-danger)] bg-[var(--ct-status-danger-soft)] px-4 py-2.5 text-sm text-[var(--ct-status-danger)]"
        >
          {error}
        </p>
      )}

      {/* Panels row */}
      <div className="grid gap-6 md:grid-cols-2">
        {showOutputs && presetA && outputs.a ? (
          <OutputPanel
            variant="compact"
            output={outputs.a}
            presetLabel={labelFor(presetA)}
            side="A"
            isPending={pending}
          />
        ) : (
          <Placeholder side="A" pending={pending && !!presetA} />
        )}

        {showOutputs && presetB && outputs.b ? (
          <OutputPanel
            variant="compact"
            output={outputs.b}
            presetLabel={labelFor(presetB)}
            side="B"
            vs={outputs.a}
            isPending={pending}
          />
        ) : (
          <Placeholder side="B" pending={pending && !!presetB} />
        )}
      </div>

      {/* Delta row: B vs A */}
      {showOutputs && outputs.a && outputs.b && (
        <DeltaRow a={outputs.a} b={outputs.b} />
      )}

      {/* Shared disclaimer */}
      <p className="border-t border-[var(--ct-border-soft)] pt-4 text-xs italic text-[var(--ct-text-muted)]">
        <span className="font-semibold not-italic text-[var(--ct-text-body)]">
          Not guaranteed.
        </span>{" "}
        Projections are conditional on stated assumptions. Methodology v1.0. Past
        performance does not predict future returns.
      </p>
    </div>
  );
}
