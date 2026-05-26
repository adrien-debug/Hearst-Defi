"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";

import type {
  ContextMenuCheckboxItemProps,
  ContextMenuContentProps,
  ContextMenuItemProps,
  ContextMenuLabelProps,
  ContextMenuProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuSeparatorProps,
  ContextMenuTriggerProps,
} from "./context-menu.types";
import { contextMenuContentVariants } from "./context-menu.variants";

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  anchor: { x: number; y: number } | null;
  setAnchor: (a: { x: number; y: number } | null) => void;
  contentId: string;
}
const Ctx = React.createContext<Ctx | null>(null);
function useCtx(name: string): Ctx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error(`<${name}/> must be inside <ContextMenu/>`);
  return v;
}

export function ContextMenu({ children }: ContextMenuProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: undefined,
    defaultProp: false,
  });
  const setOpen = React.useCallback(
    (v: boolean) => setOpenState(v),
    [setOpenState],
  );
  const [anchor, setAnchor] = React.useState<{ x: number; y: number } | null>(
    null,
  );
  const contentId = useId("ds-context-menu");
  return (
    <Ctx.Provider
      value={{ open: open ?? false, setOpen, anchor, setAnchor, contentId }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const ContextMenuTrigger = React.forwardRef<
  HTMLDivElement,
  ContextMenuTriggerProps
>(function ContextMenuTrigger(
  { onContextMenu, disabled, children, className, style, ...rest },
  ref,
) {
  const ctx = useCtx("ContextMenuTrigger");
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={style}
      onContextMenu={(event: React.MouseEvent<HTMLDivElement>) => {
        onContextMenu?.(event);
        if (disabled) return;
        event.preventDefault();
        ctx.setAnchor({ x: event.clientX, y: event.clientY });
        ctx.setOpen(true);
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

const FOCUSABLE_ITEM_SEL =
  '[role="menuitem"]:not([aria-disabled="true"]),[role="menuitemcheckbox"]:not([aria-disabled="true"]),[role="menuitemradio"]:not([aria-disabled="true"])';

function clamp(
  x: number,
  y: number,
  cw: number,
  ch: number,
): { top: number; left: number } {
  const left = Math.max(8, Math.min(x, window.innerWidth - cw - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - ch - 8));
  return { top, left };
}

const CONTENT_STYLE: React.CSSProperties = {
  position: "fixed",
  minWidth: "min(220px, 90vw)",
  maxWidth: "320px",
  padding: "var(--ds-spacing-1)",
  backgroundColor: "var(--ds-surface-overlay)",
  color: "var(--ds-text-primary)",
  border: "1px solid var(--ds-border-default)",
  borderRadius: "var(--ds-radius-md)",
  boxShadow: "var(--ds-shadow-lg)",
  zIndex: "var(--ds-z-dropdown)" as unknown as number,
};

export const ContextMenuContent = React.forwardRef<
  HTMLDivElement,
  ContextMenuContentProps
>(function ContextMenuContent(
  { className, style, children, size = "md", ...rest },
  ref,
) {
  const ctx = useCtx("ContextMenuContent");
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  React.useEffect(() => {
    if (!ctx.open || !ctx.anchor) return;
    const id = window.requestAnimationFrame(() => {
      const c = localRef.current;
      if (!c) return;
      setPos(clamp(ctx.anchor!.x, ctx.anchor!.y, c.offsetWidth, c.offsetHeight));
      const items = c.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM_SEL);
      items[0]?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [ctx.open, ctx.anchor]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const onDown = (event: MouseEvent) => {
      const c = localRef.current;
      const t = event.target as Node | null;
      if (!t || c?.contains(t)) return;
      ctx.setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        ctx.setOpen(false);
        return;
      }
      const c = localRef.current;
      if (!c) return;
      const items = Array.from(
        c.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM_SEL),
      );
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown") {
        event.preventDefault();
        items[(idx + 1) % items.length]?.focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  if (!ctx.open) return null;
  if (typeof document === "undefined") return null;

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return createPortal(
    <div
      ref={setRefs}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      className={cn(contextMenuContentVariants({ size }), className)}
      style={{
        ...CONTENT_STYLE,
        ...(pos
          ? { top: pos.top, left: pos.left }
          : { top: -9999, left: -9999, opacity: 0 }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
});

const ITEM_BASE_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ds-spacing-2)",
  padding: "var(--ds-spacing-2) var(--ds-spacing-3)",
  borderRadius: "var(--ds-radius-sm)",
  fontSize: "var(--ds-font-size-body-sm)",
  cursor: "pointer",
  userSelect: "none",
  outline: "none",
  color: "var(--ds-text-primary)",
};

function itemStyle({
  destructive,
  disabled,
  inset,
}: {
  destructive?: boolean;
  disabled?: boolean;
  inset?: boolean;
}): React.CSSProperties {
  return {
    ...ITEM_BASE_STYLE,
    ...(destructive ? { color: "var(--ds-status-danger-fg)" } : null),
    ...(disabled
      ? { color: "var(--ds-text-faint)", cursor: "not-allowed", opacity: 0.6 }
      : null),
    ...(inset ? { paddingLeft: "var(--ds-spacing-7)" } : null),
  };
}

const SHORTCUT_STYLE: React.CSSProperties = {
  marginLeft: "auto",
  fontSize: "var(--ds-font-size-caption)",
  color: "var(--ds-text-muted)",
};

export const ContextMenuItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuItemProps
>(function ContextMenuItem(
  {
    className,
    style,
    children,
    disabled,
    destructive,
    inset,
    shortcut,
    onClick,
    onSelect,
    ...rest
  },
  ref,
) {
  const ctx = useCtx("ContextMenuItem");
  return (
    <div
      ref={ref}
      role="menuitem"
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(className)}
      style={{ ...itemStyle({ destructive, disabled, inset }), ...style }}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        if (disabled) return;
        onClick?.(event);
        onSelect?.();
        ctx.setOpen(false);
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (disabled) return;
          onSelect?.();
          ctx.setOpen(false);
        }
      }}
      {...rest}
    >
      {children}
      {shortcut ? <span style={SHORTCUT_STYLE}>{shortcut}</span> : null}
    </div>
  );
});

const SEPARATOR_STYLE: React.CSSProperties = {
  height: 1,
  margin: "var(--ds-spacing-1) calc(-1 * var(--ds-spacing-1))",
  backgroundColor: "var(--ds-border-subtle)",
};

export const ContextMenuSeparator = React.forwardRef<
  HTMLDivElement,
  ContextMenuSeparatorProps
>(function ContextMenuSeparator({ className, style, ...rest }, ref) {
  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="horizontal"
      className={cn(className)}
      style={{ ...SEPARATOR_STYLE, ...style }}
      {...rest}
    />
  );
});

const LABEL_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-2) var(--ds-spacing-3)",
  fontSize: "var(--ds-font-size-caption)",
  textTransform: "uppercase",
  letterSpacing: "var(--ds-letter-spacing-wide, 0.06em)",
  color: "var(--ds-text-muted)",
  fontWeight: "var(--ds-font-weight-semibold)",
};

export const ContextMenuLabel = React.forwardRef<
  HTMLDivElement,
  ContextMenuLabelProps
>(function ContextMenuLabel(
  { className, style, inset, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        ...LABEL_STYLE,
        ...(inset ? { paddingLeft: "var(--ds-spacing-7)" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
});

const INDICATOR_STYLE: React.CSSProperties = {
  display: "inline-flex",
  width: "var(--ds-spacing-4)",
  alignItems: "center",
  justifyContent: "center",
};

export const ContextMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuCheckboxItemProps
>(function ContextMenuCheckboxItem(
  {
    className,
    style,
    children,
    checked,
    onCheckedChange,
    disabled,
    destructive,
    shortcut,
    ...rest
  },
  ref,
) {
  return (
    <div
      ref={ref}
      role="menuitemcheckbox"
      aria-checked={checked ?? false}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(className)}
      style={{ ...itemStyle({ destructive, disabled, inset: true }), ...style }}
      onClick={() => {
        if (disabled) return;
        onCheckedChange?.(!checked);
      }}
      {...rest}
    >
      <span style={INDICATOR_STYLE} aria-hidden>
        {checked ? "✓" : null}
      </span>
      {children}
      {shortcut ? <span style={SHORTCUT_STYLE}>{shortcut}</span> : null}
    </div>
  );
});

interface RadioCtx {
  value: string | undefined;
  setValue: (v: string) => void;
}
const RadioCtx = React.createContext<RadioCtx | null>(null);

export const ContextMenuRadioGroup = React.forwardRef<
  HTMLDivElement,
  ContextMenuRadioGroupProps
>(function ContextMenuRadioGroup(
  { className, style, children, value: valueProp, onValueChange, ...rest },
  ref,
) {
  const [value, setValueState] = useControllableState<string>({
    prop: valueProp,
    defaultProp: undefined,
    onChange: onValueChange,
  });
  const setValue = React.useCallback(
    (v: string) => setValueState(v),
    [setValueState],
  );
  return (
    <div
      ref={ref}
      role="group"
      className={cn(className)}
      style={style}
      {...rest}
    >
      <RadioCtx.Provider value={{ value, setValue }}>
        {children}
      </RadioCtx.Provider>
    </div>
  );
});

export const ContextMenuRadioItem = React.forwardRef<
  HTMLDivElement,
  ContextMenuRadioItemProps
>(function ContextMenuRadioItem(
  { className, style, children, value, disabled, destructive, shortcut, ...rest },
  ref,
) {
  const group = React.useContext(RadioCtx);
  const checked = group?.value === value;
  return (
    <div
      ref={ref}
      role="menuitemradio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(className)}
      style={{ ...itemStyle({ destructive, disabled, inset: true }), ...style }}
      onClick={() => {
        if (disabled) return;
        group?.setValue(value);
      }}
      {...rest}
    >
      <span style={INDICATOR_STYLE} aria-hidden>
        {checked ? "●" : null}
      </span>
      {children}
      {shortcut ? <span style={SHORTCUT_STYLE}>{shortcut}</span> : null}
    </div>
  );
});
