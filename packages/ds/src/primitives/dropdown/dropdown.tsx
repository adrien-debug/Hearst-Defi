"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";
import { Slot } from "@ds/utils/slot";

import type {
  DropdownAlign,
  DropdownCheckboxItemProps,
  DropdownContentProps,
  DropdownItemProps,
  DropdownLabelProps,
  DropdownProps,
  DropdownRadioGroupProps,
  DropdownRadioItemProps,
  DropdownSeparatorProps,
  DropdownSide,
  DropdownSubContentProps,
  DropdownSubProps,
  DropdownSubTriggerProps,
  DropdownTriggerProps,
} from "./dropdown.types";

/* -------------------------------------------------------------------------- */
/*  Root context                                                               */
/* -------------------------------------------------------------------------- */

interface RootCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentId: string;
}
const Ctx = React.createContext<RootCtx | null>(null);
function useRoot(name: string): RootCtx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error(`<${name}/> must be inside <Dropdown/>`);
  return v;
}

export function Dropdown({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
}: DropdownProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (v: boolean) => setOpenState(v),
    [setOpenState],
  );
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentId = useId("ds-dropdown");
  return (
    <Ctx.Provider value={{ open: open ?? false, setOpen, triggerRef, contentId }}>
      {children}
    </Ctx.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                    */
/* -------------------------------------------------------------------------- */

export const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps
>(function DropdownTrigger({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useRoot("DropdownTrigger");
  const Comp: React.ElementType = asChild ? Slot : "button";
  const merged = (node: HTMLButtonElement | null) => {
    ctx.triggerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref)
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };
  return (
    <Comp
      ref={merged}
      type={asChild ? undefined : "button"}
      aria-haspopup="menu"
      aria-expanded={ctx.open}
      aria-controls={ctx.contentId}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setOpen(!ctx.open);
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_ITEM_SEL = '[role="menuitem"]:not([aria-disabled="true"]),[role="menuitemcheckbox"]:not([aria-disabled="true"]),[role="menuitemradio"]:not([aria-disabled="true"])';

function positionByTrigger(
  trigger: HTMLElement,
  content: HTMLElement,
  side: DropdownSide,
  align: DropdownAlign,
  sideOffset: number,
): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect();
  const cw = content.offsetWidth;
  const ch = content.offsetHeight;
  let top = 0;
  let left = 0;
  if (side === "bottom") top = rect.bottom + sideOffset;
  else if (side === "top") top = rect.top - ch - sideOffset;
  else if (side === "left") left = rect.left - cw - sideOffset;
  else left = rect.right + sideOffset;

  if (side === "bottom" || side === "top") {
    if (align === "start") left = rect.left;
    else if (align === "end") left = rect.right - cw;
    else left = rect.left + rect.width / 2 - cw / 2;
  } else {
    if (align === "start") top = rect.top;
    else if (align === "end") top = rect.bottom - ch;
    else top = rect.top + rect.height / 2 - ch / 2;
  }
  // clamp
  left = Math.max(8, Math.min(left, window.innerWidth - cw - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - ch - 8));
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

export const DropdownContent = React.forwardRef<
  HTMLDivElement,
  DropdownContentProps
>(function DropdownContent(
  {
    className,
    style,
    children,
    side = "bottom",
    align = "start",
    sideOffset = 4,
    ...rest
  },
  ref,
) {
  const ctx = useRoot("DropdownContent");
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  // position + focus on open
  React.useEffect(() => {
    if (!ctx.open) return;
    if (typeof window === "undefined") return;
    const compute = () => {
      const t = ctx.triggerRef.current;
      const c = localRef.current;
      if (t && c) setPos(positionByTrigger(t, c, side, align, sideOffset));
    };
    const id = window.requestAnimationFrame(() => {
      compute();
      const c = localRef.current;
      if (c) {
        const items = c.querySelectorAll<HTMLElement>(FOCUSABLE_ITEM_SEL);
        items[0]?.focus();
      }
    });
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [ctx.open, ctx.triggerRef, side, align, sideOffset]);

  // outside click + escape
  React.useEffect(() => {
    if (!ctx.open) return;
    const onDown = (event: MouseEvent) => {
      const c = localRef.current;
      const t = ctx.triggerRef.current;
      const target = event.target as Node | null;
      if (!target) return;
      if (c?.contains(target)) return;
      if (t?.contains(target)) return;
      ctx.setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
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
      } else if (event.key === "Home") {
        event.preventDefault();
        items[0]?.focus();
      } else if (event.key === "End") {
        event.preventDefault();
        items[items.length - 1]?.focus();
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
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return createPortal(
    <div
      ref={setRefs}
      id={ctx.contentId}
      role="menu"
      tabIndex={-1}
      className={cn(className)}
      style={{
        ...CONTENT_STYLE,
        ...(pos
          ? { top: pos.top, left: pos.left }
          : { top: 0, left: 0, opacity: 0 }),
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  );
});

/* -------------------------------------------------------------------------- */
/*  Item                                                                       */
/* -------------------------------------------------------------------------- */

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
  letterSpacing: "var(--ds-letter-spacing-wide, 0.05em)",
};

export const DropdownItem = React.forwardRef<HTMLDivElement, DropdownItemProps>(
  function DropdownItem(
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
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const ctx = useRoot("DropdownItem");
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
          onKeyDown?.(event);
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
  },
);

/* -------------------------------------------------------------------------- */
/*  Separator / label                                                          */
/* -------------------------------------------------------------------------- */

const SEPARATOR_STYLE: React.CSSProperties = {
  height: 1,
  margin: "var(--ds-spacing-1) calc(-1 * var(--ds-spacing-1))",
  backgroundColor: "var(--ds-border-subtle)",
};

export const DropdownSeparator = React.forwardRef<
  HTMLDivElement,
  DropdownSeparatorProps
>(function DropdownSeparator({ className, style, ...rest }, ref) {
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

export const DropdownLabel = React.forwardRef<
  HTMLDivElement,
  DropdownLabelProps
>(function DropdownLabel({ className, style, inset, children, ...rest }, ref) {
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

/* -------------------------------------------------------------------------- */
/*  Checkbox / radio                                                           */
/* -------------------------------------------------------------------------- */

const INDICATOR_STYLE: React.CSSProperties = {
  display: "inline-flex",
  width: "var(--ds-spacing-4)",
  alignItems: "center",
  justifyContent: "center",
};

export const DropdownCheckboxItem = React.forwardRef<
  HTMLDivElement,
  DropdownCheckboxItemProps
>(function DropdownCheckboxItem(
  {
    className,
    style,
    children,
    checked,
    onCheckedChange,
    disabled,
    destructive,
    inset,
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
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (disabled) return;
          onCheckedChange?.(!checked);
        }
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

interface RadioGroupCtx {
  value: string | undefined;
  setValue: (v: string) => void;
}
const RadioGroupCtx = React.createContext<RadioGroupCtx | null>(null);

export const DropdownRadioGroup = React.forwardRef<
  HTMLDivElement,
  DropdownRadioGroupProps
>(function DropdownRadioGroup(
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
      <RadioGroupCtx.Provider value={{ value, setValue }}>
        {children}
      </RadioGroupCtx.Provider>
    </div>
  );
});

export const DropdownRadioItem = React.forwardRef<
  HTMLDivElement,
  DropdownRadioItemProps
>(function DropdownRadioItem(
  {
    className,
    style,
    children,
    value,
    disabled,
    destructive,
    shortcut,
    ...rest
  },
  ref,
) {
  const group = React.useContext(RadioGroupCtx);
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
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (disabled) return;
          group?.setValue(value);
        }
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

/* -------------------------------------------------------------------------- */
/*  Sub menu — minimal hover-open                                              */
/* -------------------------------------------------------------------------- */

interface SubCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const SubContext = React.createContext<SubCtx | null>(null);

export function DropdownSub({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
}: DropdownSubProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (v: boolean) => setOpenState(v),
    [setOpenState],
  );
  return (
    <SubContext.Provider value={{ open: open ?? false, setOpen }}>
      <div style={{ position: "relative" }}>{children}</div>
    </SubContext.Provider>
  );
}

export const DropdownSubTrigger = React.forwardRef<
  HTMLDivElement,
  DropdownSubTriggerProps
>(function DropdownSubTrigger(
  { className, style, children, disabled, destructive, inset, ...rest },
  ref,
) {
  const sub = React.useContext(SubContext);
  return (
    <div
      ref={ref}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={sub?.open}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className={cn(className)}
      style={{ ...itemStyle({ destructive, disabled, inset }), ...style }}
      onMouseEnter={() => sub?.setOpen(true)}
      onMouseLeave={() => sub?.setOpen(false)}
      onClick={() => sub?.setOpen(!(sub?.open ?? false))}
      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowRight" || event.key === "Enter") {
          event.preventDefault();
          sub?.setOpen(true);
        } else if (event.key === "ArrowLeft" || event.key === "Escape") {
          sub?.setOpen(false);
        }
      }}
      {...rest}
    >
      {children}
      <span style={{ marginLeft: "auto" }} aria-hidden>
        ›
      </span>
    </div>
  );
});

const SUB_CONTENT_STYLE: React.CSSProperties = {
  ...CONTENT_STYLE,
  position: "absolute",
  top: 0,
  left: "100%",
};

export const DropdownSubContent = React.forwardRef<
  HTMLDivElement,
  DropdownSubContentProps
>(function DropdownSubContent({ className, style, children, ...rest }, ref) {
  const sub = React.useContext(SubContext);
  if (!sub?.open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      className={cn(className)}
      style={{ ...SUB_CONTENT_STYLE, ...style }}
      onMouseEnter={() => sub?.setOpen(true)}
      onMouseLeave={() => sub?.setOpen(false)}
      {...rest}
    >
      {children}
    </div>
  );
});
