"use client";

// useBacktest — backtest period selection + result state for the Scenario Lab.
// Extracted verbatim (behaviour-preserving) from lab-shell.tsx. Calls the
// existing Server Action; contains no business maths.

import { useCallback, useState, useTransition } from "react";

import { runBacktestAction } from "@/app/admin/scenario-lab/actions";
import type { BacktestKey, BacktestOutput } from "@/lib/engine/types";

export interface BacktestState {
  selectedKey: BacktestKey | null;
  output: BacktestOutput | null;
}

export function useBacktest() {
  const [state, setState] = useState<BacktestState>({
    selectedKey: null,
    output: null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const select = useCallback((key: BacktestKey) => {
    setError(null);
    setState((prev) => ({ ...prev, selectedKey: key, output: null }));
    startTransition(async () => {
      try {
        const output = await runBacktestAction(key);
        setState({ selectedKey: key, output });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    });
  }, []);

  return { state, pending, error, select };
}
