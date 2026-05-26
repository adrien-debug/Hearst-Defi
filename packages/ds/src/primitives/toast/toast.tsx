"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type {
  ToastApi,
  ToastInstance,
  ToastOptions,
  ToastPosition,
  ToastProviderProps,
  ToastVariant,
  ToastViewportProps,
} from "./toast.types";
import { toastVariants } from "./toast.variants";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface InternalCtx extends ToastApi {
  toasts: ToastInstance[];
  position: ToastPosition;
  maxVisible: number;
}
const ToastCtx = React.createContext<InternalCtx | null>(null);

const DEFAULT_DURATION = 5000;
const MAX_VISIBLE = 3;

let seq = 0;
const nextId = (): string => {
  seq += 1;
  return `ds-toast-${seq}`;
};

/* -------------------------------------------------------------------------- */
/*  Provider                                                                   */
/* -------------------------------------------------------------------------- */

export function ToastProvider({
  children,
  position = "top-right",
  maxVisible = MAX_VISIBLE,
  defaultDuration = DEFAULT_DURATION,
}: ToastProviderProps): React.JSX.Element {
  const [toasts, setToasts] = React.useState<ToastInstance[]>([]);
  const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const dismissAll = React.useCallback(() => {
    setToasts([]);
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
  }, []);

  const toast = React.useCallback(
    (opts: ToastOptions): string => {
      const id = nextId();
      const instance: ToastInstance = { id, ...opts };
      setToasts((prev) => [...prev, instance]);
      const duration = opts.duration ?? defaultDuration;
      if (Number.isFinite(duration)) {
        const handle = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, handle);
      }
      return id;
    },
    [defaultDuration, dismiss],
  );

  React.useEffect(
    () => () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    },
    [],
  );

  const value: InternalCtx = {
    toast,
    dismiss,
    dismissAll,
    toasts,
    position,
    maxVisible,
  };

  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast() must be used inside <ToastProvider/>");
  }
  return { toast: ctx.toast, dismiss: ctx.dismiss, dismissAll: ctx.dismissAll };
}

/* -------------------------------------------------------------------------- */
/*  Viewport                                                                   */
/* -------------------------------------------------------------------------- */

const POSITION_STYLE: Record<ToastPosition, React.CSSProperties> = {
  "top-right": {
    top: "var(--ds-spacing-4)",
    right: "var(--ds-spacing-4)",
    alignItems: "flex-end",
  },
  "top-center": {
    top: "var(--ds-spacing-4)",
    left: "50%",
    transform: "translateX(-50%)",
    alignItems: "center",
  },
  "bottom-right": {
    bottom: "var(--ds-spacing-4)",
    right: "var(--ds-spacing-4)",
    alignItems: "flex-end",
  },
  "bottom-center": {
    bottom: "var(--ds-spacing-4)",
    left: "50%",
    transform: "translateX(-50%)",
    alignItems: "center",
  },
};

const VIEWPORT_BASE: React.CSSProperties = {
  position: "fixed",
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-2)",
  margin: 0,
  padding: 0,
  listStyle: "none",
  zIndex: "var(--ds-z-toast)" as unknown as number,
  pointerEvents: "none",
  maxWidth: "min(420px, calc(100vw - var(--ds-spacing-8)))",
};

const VARIANT_STYLE: Record<ToastVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--ds-surface-overlay)",
    color: "var(--ds-text-primary)",
    borderColor: "var(--ds-border-default)",
  },
  success: {
    backgroundColor: "var(--ds-status-success-bg)",
    color: "var(--ds-status-success-fg)",
    borderColor: "var(--ds-status-success-border)",
  },
  error: {
    backgroundColor: "var(--ds-status-danger-bg)",
    color: "var(--ds-status-danger-fg)",
    borderColor: "var(--ds-status-danger-border)",
  },
  warning: {
    backgroundColor: "var(--ds-status-warning-bg)",
    color: "var(--ds-status-warning-fg)",
    borderColor: "var(--ds-status-warning-border)",
  },
  info: {
    backgroundColor: "var(--ds-status-info-bg)",
    color: "var(--ds-status-info-fg)",
    borderColor: "var(--ds-status-info-border)",
  },
};

const TOAST_ITEM_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-1)",
  padding: "var(--ds-spacing-3) var(--ds-spacing-4)",
  border: "1px solid transparent",
  borderRadius: "var(--ds-radius-toast)",
  boxShadow: "var(--ds-shadow-lg)",
  pointerEvents: "auto",
  minWidth: "260px",
};

const TITLE_STYLE: React.CSSProperties = {
  fontWeight: "var(--ds-font-weight-semibold)",
  fontSize: "var(--ds-font-size-body-sm)",
  lineHeight: "var(--ds-line-height-tight, 1.25)",
};
const DESC_STYLE: React.CSSProperties = {
  fontSize: "var(--ds-font-size-body-xs)",
  color: "inherit",
  opacity: 0.85,
};
const ACTION_STYLE: React.CSSProperties = {
  alignSelf: "flex-end",
  marginTop: "var(--ds-spacing-1)",
  background: "transparent",
  border: "1px solid currentColor",
  color: "inherit",
  borderRadius: "var(--ds-radius-sm)",
  padding: "var(--ds-spacing-1) var(--ds-spacing-2)",
  fontSize: "var(--ds-font-size-body-xs)",
  cursor: "pointer",
};
const CLOSE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: "var(--ds-spacing-1)",
  right: "var(--ds-spacing-2)",
  background: "transparent",
  border: 0,
  color: "inherit",
  cursor: "pointer",
  fontSize: "var(--ds-font-size-body-md)",
  lineHeight: 1,
};

export function ToastViewport({
  position,
  className,
  style,
  ...rest
}: ToastViewportProps): React.JSX.Element | null {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) return null;
  const pos = position ?? ctx.position;
  const visible = ctx.toasts.slice(-ctx.maxVisible);
  return (
    <ol
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className={cn(className)}
      style={{ ...VIEWPORT_BASE, ...POSITION_STYLE[pos], ...style }}
      {...rest}
    >
      {visible.map((t) => {
        const v = t.variant ?? "default";
        return (
          <li
            key={t.id}
            role={v === "error" ? "alert" : "status"}
            aria-atomic
            className={cn(toastVariants({ variant: v }))}
            style={{
              ...TOAST_ITEM_STYLE,
              ...VARIANT_STYLE[v],
              position: "relative",
            }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              style={CLOSE_STYLE}
              onClick={() => ctx.dismiss(t.id)}
            >
              ×
            </button>
            <div style={TITLE_STYLE}>{t.title}</div>
            {t.description ? (
              <div style={DESC_STYLE}>{t.description}</div>
            ) : null}
            {t.action ? (
              <button
                type="button"
                style={ACTION_STYLE}
                onClick={() => {
                  t.action?.onClick();
                  ctx.dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
