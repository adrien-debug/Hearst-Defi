"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { runComparisonAction } from "@/app/(product)/scenario-lab/actions";
import { DeltaRow } from "@/components/scenario/delta-row";
import { OutputPanelCompact } from "@/components/scenario/output-panel-compact";
import { PRESETS } from "@/components/scenario/preset-bar";
import { cn } from "@/lib/cn";
import type { Preset, ScenarioOutput } from "@/lib/engine/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function labelFor(preset: Preset): string {
  return PRESETS.find((p) => p.id === preset)?.label ?? preset;
}

// ── Preset picker (dropdown) ─────────────────────────────────────────────────

interface PresetPickerProps {
  side: "A" | "B";
  value: Preset | null;
  /** When provided, this preset is greyed out / disabled in the menu (already
   * chosen on the other side). */
  excluded: Preset | null;
  disabled: boolean;
  onChange: (preset: Preset) => void;
}

function PresetPicker({
  side,
  value,
  excluded,
  disabled,
  onChange,
}: PresetPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Move focus to the first selectable option when the listbox opens so the
  // keyboard user can act on the menu they just summoned. Without this the
  // focus stays on the trigger and Tab leaves the dropdown entirely.
  useEffect(() => {
    if (!open) return;
    const first = listboxRef.current?.querySelector<HTMLButtonElement>(
      'button[role="option"]:not([disabled])',
    );
    first?.focus();
  }, [open]);

  // Arrow key navigation within the listbox. Up/Down cycle through enabled
  // options; Home/End jump to first/last.
  function onListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    if (!listboxRef.current) return;
    const options = Array.from(
      listboxRef.current.querySelectorAll<HTMLButtonElement>(
        'button[role="option"]:not([disabled])',
      ),
    );
    if (options.length === 0) return;
    const active = document.activeElement as HTMLButtonElement | null;
    const idx = active ? options.indexOf(active) : -1;
    let next = idx;
    if (e.key === "ArrowDown") next = idx < 0 ? 0 : (idx + 1) % options.length;
    else if (e.key === "ArrowUp")
      next = idx < 0 ? options.length - 1 : (idx - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    options[next]?.focus();
  }

  const sideAccent =
    side === "A"
      ? "border-l-[--ct-border-strong]"
      : "border-l-[--ct-text-strong]";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Scenario ${side}: ${value ? labelFor(value) : "select a scenario"}`}
        className={cn(
          "flex w-full items-center justify-between gap-3 glass-panel",
          "border-l-4",
          sideAccent,
          "px-4 py-3 text-left",
          "disabled:cursor-not-allowed disabled:opacity-40",
          "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
        )}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="eyebrow">Scenario {side}</span>
          <span
            className={cn(
              "h4 truncate",
              !value && "text-[--ct-text-muted] font-medium",
            )}
          >
            {value ? labelFor(value) : "Select a scenario"}
          </span>
        </span>
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-[--ct-text-body] transition-transform duration-[var(--ct-dur-fast)]",
            open && "rotate-180",
          )}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listboxRef}
          role="listbox"
          aria-label={`Pick a scenario for ${side}`}
          onKeyDown={onListKeyDown}
          className={cn(
            "absolute z-[var(--ct-z-dropdown)] mt-2 w-full overflow-hidden",
            "glass-panel p-0",
            "shadow-[var(--ct-shadow-elevated)]",
          )}
        >
          {PRESETS.map((p) => {
            const isSelected = value === p.id;
            const isExcluded = excluded === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isExcluded}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                    triggerRef.current?.focus();
                  }}
                  title={p.description}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left",
                    "transition-colors duration-[var(--ct-dur-fast)]",
                    "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
                    isSelected
                      ? "bg-[--ct-surface-1] text-[--ct-text-strong]"
                      : "text-[--ct-text-body] hover:bg-[--ct-surface-3] hover:text-[--ct-text-primary]",
                    isExcluded &&
                      "cursor-not-allowed opacity-40 hover:bg-transparent",
                  )}
                >
                  <span className="text-sm font-semibold">{p.label}</span>
                  <span className="text-micro text-[--ct-text-muted]">
                    {isExcluded ? "Already on the other side" : p.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
          ? "border-l-[--ct-border-strong]"
          : "border-l-[--ct-text-strong]",
        "px-5 py-5",
        "transition-opacity duration-[var(--ct-dur-fast)]",
        pending && "opacity-50",
      )}
      aria-live="polite"
    >
      {pending ? (
        <>
          <svg
            className="h-4 w-4 animate-spin text-[--ct-text-strong]"
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
          <p className="stat-label text-[--ct-text-body]">Computing…</p>
        </>
      ) : (
        <>
          <svg
            className="h-10 w-10 text-[--ct-text-muted]"
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
          <p className="text-center text-sm text-[--ct-text-muted]">
            <span className="font-semibold text-[--ct-text-body]">
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
          excluded={presetB}
          disabled={pending}
          onChange={handleSelectA}
        />
        <PresetPicker
          side="B"
          value={presetB}
          excluded={presetA}
          disabled={pending}
          onChange={handleSelectB}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[--radius-button] border border-[--ct-status-danger] bg-[--ct-status-danger-soft] px-4 py-2.5 text-sm text-[--ct-status-danger]"
        >
          {error}
        </p>
      )}

      {/* Panels row */}
      <div className="grid gap-6 md:grid-cols-2">
        {showOutputs && presetA && outputs.a ? (
          <OutputPanelCompact
            output={outputs.a}
            presetLabel={labelFor(presetA)}
            side="A"
            isPending={pending}
          />
        ) : (
          <Placeholder side="A" pending={pending && !!presetA} />
        )}

        {showOutputs && presetB && outputs.b ? (
          <OutputPanelCompact
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
      <p className="border-t border-[--ct-border-soft] pt-4 text-xs italic text-[--ct-text-muted]">
        <span className="font-semibold not-italic text-[--ct-text-body]">
          Not guaranteed.
        </span>{" "}
        Projections are conditional on stated assumptions. Methodology v1.0. Past
        performance does not predict future returns.
      </p>
    </div>
  );
}
