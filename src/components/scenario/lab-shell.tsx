"use client";

import { useCallback, useState, useTransition } from "react";

import {
  getPresetInputsAction,
  runBacktestAction,
  runScenarioAction,
} from "@/app/admin/scenario-lab/actions";
import { BacktestPanel } from "@/components/scenario/backtest-panel";
import { CompareMode } from "@/components/scenario/compare-mode";
import { InputsPanel } from "@/components/scenario/inputs-panel";
import { OutputPanel } from "@/components/scenario/output-panel";
import { PresetBar } from "@/components/scenario/preset-bar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ScenarioNarrativeOutput } from "@/lib/agents/schemas";
import type {
  BacktestKey,
  BacktestOutput,
  Preset,
  ScenarioInputs,
  ScenarioOutput,
} from "@/lib/engine/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_INPUTS: ScenarioInputs = {
  btc_price_change_pct: 0,
  hashprice_usd_th_day: 0.085,
  energy_cost_kwh: 0.045,
  stable_apy_pct: 4.5,
  vol_index: 2,
};

type Tab = "scenario" | "backtest";

type ScenarioMode = "single" | "compare";

interface BacktestMeta {
  key: BacktestKey;
  label: string;
  subtitle: string;
  description: string;
}

const BACKTEST_PERIODS: BacktestMeta[] = [
  {
    key: "bear_2022",
    label: "BTC Bear 2022",
    subtitle: "Jun 2022 — Jun 2023 · 12 months",
    description:
      "BTC dropped 65%, hashprice fell 60%. Tests vault resilience in a sustained bear market with mining margin compression.",
  },
  {
    key: "etf_halving_2024",
    label: "ETF + Halving 2024",
    subtitle: "Oct 2023 — Apr 2025 · 18 months",
    description:
      "Spot ETF approval drove BTC +150%. Halving compression created a mid-period dip before recovery.",
  },
  {
    key: "mining_crunch_2024",
    label: "Mining Crunch 2024",
    subtitle: "Apr 2024 — Dec 2024 · 9 months",
    description:
      "Hashprice fell 40%, difficulty rose 30%, BTC price flat. Pure mining-margin stress with no price relief.",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabShellState {
  selectedPreset: Preset | null;
  inputs: ScenarioInputs;
  output: ScenarioOutput | null;
  narrative: ScenarioNarrativeOutput | null;
}

interface BacktestState {
  selectedKey: BacktestKey | null;
  output: BacktestOutput | null;
}

// ── Tab toggle ────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

function TabBar({ active, onChange }: TabBarProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const tabs: Tab[] = ["scenario", "backtest"];
    const idx = tabs.indexOf(active);
    if (e.key === "ArrowRight") {
      onChange(tabs[(idx + 1) % tabs.length]!);
    } else if (e.key === "ArrowLeft") {
      onChange(tabs[(idx - 1 + tabs.length) % tabs.length]!);
    }
  }

  return (
    <nav
      aria-label="Scenario Lab tabs"
      className="flex gap-1 glass-panel-subtle p-1 w-fit"
      onKeyDown={handleKeyDown}
    >
      {(["scenario", "backtest"] as Tab[]).map((tab) => {
        const isActive = active === tab;
        return (
          <Button
            key={tab}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-controls={`tabpanel-${tab}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            variant="ghost"
            size="sm"
            onClick={() => onChange(tab)}
            className={cn(
              "rounded-[var(--ct-radius-sm)] px-5 py-2 text-sm font-semibold capitalize shadow-none active:scale-100",
              isActive
                ? "bg-[var(--ct-text-strong)] text-[var(--ct-bg-deep)] hover:bg-[var(--ct-text-strong)] hover:text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-body)] hover:text-[var(--ct-text-primary)]",
            )}
          >
            {tab === "scenario" ? "Scenario" : "Backtest"}
          </Button>
        );
      })}
    </nav>
  );
}

// ── Scenario mode toggle (Single / Compare) ───────────────────────────────────

interface ScenarioModeToggleProps {
  active: ScenarioMode;
  onChange: (mode: ScenarioMode) => void;
}

function ScenarioModeToggle({ active, onChange }: ScenarioModeToggleProps) {
  return (
    <div
      role="tablist"
      aria-label="Scenario mode"
      className="inline-flex gap-1 glass-panel-subtle p-1"
    >
      {(["single", "compare"] as ScenarioMode[]).map((mode) => {
        const isActive = active === mode;
        return (
          <Button
            key={mode}
            type="button"
            role="tab"
            id={`tab-mode-${mode}`}
            aria-controls={`tabpanel-mode-${mode}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            variant="ghost"
            size="sm"
            onClick={() => onChange(mode)}
            className={cn(
              "rounded-[var(--ct-radius-sm)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-none active:scale-100",
              isActive
                ? "bg-[var(--ct-text-strong)] text-[var(--ct-bg-deep)] hover:bg-[var(--ct-text-strong)] hover:text-[var(--ct-bg-deep)]"
                : "text-[var(--ct-text-body)] hover:text-[var(--ct-text-primary)]",
            )}
          >
            {mode}
          </Button>
        );
      })}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
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
  );
}

// ── Backtest tab ──────────────────────────────────────────────────────────────

interface BacktestTabProps {
  state: BacktestState;
  isPending: boolean;
  error: string | null;
  onSelect: (key: BacktestKey) => void;
}

function BacktestTab({ state, isPending, error, onSelect }: BacktestTabProps) {
  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-3">
        {BACKTEST_PERIODS.map((p) => {
          const isActive = state.selectedKey === p.key;
          return (
            <button
              key={p.key}
              type="button"
              disabled={isPending}
              onClick={() => onSelect(p.key)}
              aria-pressed={isActive}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-[var(--ct-radius-full)] border px-4 py-3 text-left",
                "transition-[background-color,color,border-color,box-shadow] duration-[var(--ct-dur-fast)]",
                "disabled:cursor-not-allowed disabled:opacity-40",
                "focus-visible:outline-none focus-visible:shadow-[var(--ct-shadow-focus-ring)]",
                isActive
                  ? [
                      "border-[var(--ct-text-strong)] bg-[var(--ct-text-strong)] text-[var(--ct-bg-deep)]",
                      "shadow-[var(--ct-shadow-focus-ring)]",
                    ]
                  : [
                      "border-[var(--ct-border-strong)] bg-[var(--ct-surface-1)]",
                      "text-[var(--ct-text-body)]",
                      "hover:border-[var(--ct-border-strong)] hover:bg-[var(--ct-surface-3)] hover:text-[var(--ct-text-primary)]",
                    ],
              )}
            >
              <span className="text-sm font-semibold leading-tight">
                {p.label}
              </span>
              <span
                className={cn(
                  "text-xs leading-tight",
                  isActive
                    ? "text-[var(--ct-bg-deep)] opacity-70"
                    : "text-[var(--ct-text-muted)]",
                )}
              >
                {p.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* Period description — shown when no results yet */}
      {!state.output && !isPending && state.selectedKey === null && (
        <div className="space-y-3">
          {BACKTEST_PERIODS.map((p) => (
            <div
              key={p.key}
              className="glass-panel-subtle px-5 py-4"
            >
              <p className="text-sm font-semibold text-[var(--ct-text-body)]">
                {p.label}
              </p>
              <p className="mt-1 text-xs text-[var(--ct-text-muted)]">
                {p.subtitle}
              </p>
              <p className="mt-2 text-sm text-[var(--ct-text-body)]">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <p className="rounded-[var(--ct-radius-full)] border border-[var(--ct-status-danger)] bg-[var(--ct-status-danger-soft)] px-4 py-2.5 text-sm text-[var(--ct-status-danger)]">
          {error}
        </p>
      )}

      {/* Loading state */}
      {isPending && (
        <div
          className={cn(
            "flex min-h-64 flex-col items-center justify-center gap-3",
            "glass-panel-subtle border-dashed",
          )}
        >
          <Spinner />
          <p className="stat-label text-[var(--ct-text-body)]">
            Computing backtest…
          </p>
        </div>
      )}

      {/* Results */}
      {state.output && !isPending && (
        <BacktestPanel output={state.output} isPending={isPending} />
      )}
    </div>
  );
}

// ── Main shell ────────────────────────────────────────────────────────────────

export function LabShell() {
  const [activeTab, setActiveTab] = useState<Tab>("scenario");
  const [scenarioMode, setScenarioMode] = useState<ScenarioMode>("single");

  // — Scenario state —
  const [scenarioState, setScenarioState] = useState<LabShellState>({
    selectedPreset: null,
    inputs: BASE_INPUTS,
    output: null,
    narrative: null,
  });
  const [scenarioPending, startScenarioTransition] = useTransition();
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  // — Backtest state —
  const [backtestState, setBacktestState] = useState<BacktestState>({
    selectedKey: null,
    output: null,
  });
  const [backtestPending, startBacktestTransition] = useTransition();
  const [backtestError, setBacktestError] = useState<string | null>(null);

  // ── Scenario handlers ───────────────────────────────────────────────────────

  const submit = useCallback(
    (inputs: ScenarioInputs, presetId: string = "custom") => {
      setScenarioError(null);
      startScenarioTransition(async () => {
        try {
          const result = await runScenarioAction(inputs, presetId);
          setScenarioState((prev) => ({
            ...prev,
            inputs,
            output: result,
            narrative: result.narrative,
          }));
        } catch (e) {
          setScenarioError(e instanceof Error ? e.message : "Unknown error");
        }
      });
    },
    [],
  );

  function handlePresetSelect(preset: Preset) {
    setScenarioError(null);
    startScenarioTransition(async () => {
      try {
        const inputs = await getPresetInputsAction(preset);
        const result = await runScenarioAction(inputs, preset);
        setScenarioState({
          selectedPreset: preset,
          inputs,
          output: result,
          narrative: result.narrative,
        });
      } catch (e) {
        setScenarioError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }

  function handleInputChange(inputs: ScenarioInputs) {
    setScenarioState((prev) => ({ ...prev, selectedPreset: null, inputs }));
  }

  // ── Backtest handlers ───────────────────────────────────────────────────────

  function handleBacktestSelect(key: BacktestKey) {
    setBacktestError(null);
    setBacktestState((prev) => ({ ...prev, selectedKey: key, output: null }));
    startBacktestTransition(async () => {
      try {
        const output = await runBacktestAction(key);
        setBacktestState({ selectedKey: key, output });
      } catch (e) {
        setBacktestError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Tab toggle */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Scenario tab ──────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-scenario"
        aria-labelledby="tab-scenario"
        hidden={activeTab !== "scenario"}
      >
        <div className="space-y-6">
          {/* Mode toggle: Single | Compare */}
          <div className="flex items-center justify-between gap-4">
            <p className="eyebrow">
              {scenarioMode === "single"
                ? "Run one scenario"
                : "Compare two scenarios side-by-side"}
            </p>
            <ScenarioModeToggle
              active={scenarioMode}
              onChange={setScenarioMode}
            />
          </div>

          {/* Single / Compare sub-panels */}
          <div
            role="tabpanel"
            id="tabpanel-mode-single"
            aria-labelledby="tab-mode-single"
            hidden={scenarioMode !== "single"}
            tabIndex={0}
          >
            {scenarioMode === "single" && (
              <SingleMode
                scenarioState={scenarioState}
                scenarioPending={scenarioPending}
                scenarioError={scenarioError}
                onPresetSelect={handlePresetSelect}
                onInputChange={handleInputChange}
                onSubmit={() => submit(scenarioState.inputs)}
              />
            )}
          </div>
          <div
            role="tabpanel"
            id="tabpanel-mode-compare"
            aria-labelledby="tab-mode-compare"
            hidden={scenarioMode !== "compare"}
            tabIndex={0}
          >
            <CompareMode active={scenarioMode === "compare"} />
          </div>
        </div>
      </div>

      {/* ── Backtest tab ───────────────────────────────────────────────── */}
      <div
        role="tabpanel"
        id="tabpanel-backtest"
        aria-labelledby="tab-backtest"
        hidden={activeTab !== "backtest"}
        tabIndex={0}
      >
        <BacktestTab
          state={backtestState}
          isPending={backtestPending}
          error={backtestError}
          onSelect={handleBacktestSelect}
        />
      </div>
    </div>
  );
}

// ── Single mode (extracted from original Scenario tab body) ──────────────────

interface SingleModeProps {
  scenarioState: LabShellState;
  scenarioPending: boolean;
  scenarioError: string | null;
  onPresetSelect: (preset: Preset) => void;
  onInputChange: (inputs: ScenarioInputs) => void;
  onSubmit: () => void;
}

function SingleMode({
  scenarioState,
  scenarioPending,
  scenarioError,
  onPresetSelect,
  onInputChange,
  onSubmit,
}: SingleModeProps) {
  return (
    <div className="space-y-6">
      <PresetBar
        selected={scenarioState.selectedPreset}
        onSelect={onPresetSelect}
        disabled={scenarioPending}
      />

      {scenarioError && (
        <p className="rounded-[var(--ct-radius-full)] border border-[var(--ct-status-danger)] bg-[var(--ct-status-danger-soft)] px-4 py-2.5 text-sm text-[var(--ct-status-danger)]">
          {scenarioError}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(var(--ct-input-panel-min,360px),var(--ct-input-panel-max,420px))_1fr]">
        {/* Left: Inputs panel */}
        <div className="flex flex-col gap-0 glass-panel p-0 overflow-hidden">
          <div className="border-b border-[var(--ct-border-soft)] px-6 py-4">
            <h3 className="h4">Inputs</h3>
            <p className="mt-0.5 text-xs text-[var(--ct-text-muted)]">
              Adjust sliders or select a preset above
            </p>
          </div>

          <div
            className={cn(
              "flex-1 px-6 py-5",
              scenarioPending && "pointer-events-none opacity-50",
            )}
          >
            <InputsPanel
              inputs={scenarioState.inputs}
              onChange={onInputChange}
              disabled={scenarioPending}
            />
          </div>

          <div className="border-t border-[var(--ct-border-soft)] px-6 py-5">
            <Button
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              onClick={onSubmit}
              disabled={scenarioPending}
            >
              {scenarioPending ? (
                <>
                  <Spinner />
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

        {/* Right: Output panel */}
        <div className="min-w-0">
          {scenarioState.output ? (
            <OutputPanel
              output={scenarioState.output}
              isPending={scenarioPending}
              narrative={scenarioState.narrative}
            />
          ) : (
            <div
              className={cn(
                "flex min-h-80 flex-col items-center justify-center gap-3",
                "glass-panel-subtle border-dashed",
                "transition-opacity duration-[var(--ct-dur-fast)]",
                scenarioPending && "opacity-50",
              )}
            >
              {scenarioPending ? (
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
                  <p className="stat-label">Computing…</p>
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
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                    />
                  </svg>
                  <p className="max-w-xs text-center text-sm text-[var(--ct-text-muted)]">
                    Select a preset above or adjust the sliders,{" "}
                    <br />
                    then press{" "}
                    <span className="font-semibold text-[var(--ct-text-body)]">
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
