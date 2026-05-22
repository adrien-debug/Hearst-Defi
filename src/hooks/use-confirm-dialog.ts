"use client";

// useConfirmDialog — imperative, promise-based confirmation flow.
// Call `confirm(config)` to open a dialog and await the user's choice; the
// returned promise resolves `true` on confirm and `false` on cancel. Pair the
// returned `{ isOpen, config, resolve, reject }` with a <ConfirmDialog> (or any
// confirm UI) in the rendering component.

import { useCallback, useRef, useState } from "react";

export interface ConfirmConfig {
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
}

interface UseConfirmDialogResult {
  isOpen: boolean;
  config: ConfirmConfig | null;
  /** Open the dialog; resolves true (confirm) / false (cancel). */
  confirm: (config: ConfirmConfig) => Promise<boolean>;
  /** Settle as confirmed and close. */
  resolve: () => void;
  /** Settle as cancelled and close. */
  reject: () => void;
}

export function useConfirmDialog(): UseConfirmDialogResult {
  const [config, setConfig] = useState<ConfirmConfig | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setConfig(null);
  }, []);

  const confirm = useCallback((next: ConfirmConfig): Promise<boolean> => {
    // If a prior dialog is still pending, treat it as cancelled.
    resolverRef.current?.(false);
    setConfig(next);
    return new Promise<boolean>((res) => {
      resolverRef.current = res;
    });
  }, []);

  const resolve = useCallback(() => settle(true), [settle]);
  const reject = useCallback(() => settle(false), [settle]);

  return { isOpen: config !== null, config, confirm, resolve, reject };
}
