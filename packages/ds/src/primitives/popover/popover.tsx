"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";
import { Slot } from "@ds/utils/slot";

import type {
  PopoverAlign,
  PopoverCloseProps,
  PopoverContentProps,
  PopoverFooterProps,
  PopoverHeaderProps,
  PopoverProps,
  PopoverSide,
  PopoverSize,
  PopoverTriggerProps,
  PopoverVariant,
} from "./popover.types";
import { popoverContentVariants } from "./popover.variants";

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentId: string;
}
const Ctx = React.createContext<Ctx | null>(null);
function useCtx(name: string): Ctx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error(`<${name}/> must be inside <Popover/>`);
  return v;
}

export function Popover({
  open: openProp,
  defaultOpen,
  onOpenChange,
  children,
}: PopoverProps): React.JSX.Element {
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
  const contentId = useId("ds-popover");
  return (
    <Ctx.Provider value={{ open: open ?? false, setOpen, triggerRef, contentId }}>
      {children}
    </Ctx.Provider>
  );
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverTriggerProps
>(function PopoverTrigger({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useCtx("PopoverTrigger");
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
      aria-haspopup="dialog"
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

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function pos(
  trigger: HTMLElement,
  content: HTMLElement,
  side: PopoverSide,
  align: PopoverAlign,
  sideOffset: number,
): { top: number; left: number } {
  const r = trigger.getBoundingClientRect();
  const cw = content.offsetWidth;
  const ch = content.offsetHeight;
  let top = 0;
  let left = 0;
  if (side === "top") top = r.top - ch - sideOffset;
  else if (side === "bottom") top = r.bottom + sideOffset;
  else if (side === "left") left = r.left - cw - sideOffset;
  else left = r.right + sideOffset;
  if (side === "top" || side === "bottom") {
    if (align === "start") left = r.left;
    else if (align === "end") left = r.right - cw;
    else left = r.left + r.width / 2 - cw / 2;
  } else {
    if (align === "start") top = r.top;
    else if (align === "end") top = r.bottom - ch;
    else top = r.top + r.height / 2 - ch / 2;
  }
  left = Math.max(8, Math.min(left, window.innerWidth - cw - 8));
  top = Math.max(8, Math.min(top, window.innerHeight - ch - 8));
  return { top, left };
}

const SIZE_STYLE: Record<PopoverSize, React.CSSProperties> = {
  sm: { minWidth: "200px", maxWidth: "260px" },
  md: { minWidth: "260px", maxWidth: "360px" },
  lg: { minWidth: "320px", maxWidth: "440px" },
};

const VARIANT_PADDING: Record<PopoverVariant, string> = {
  default: "var(--ds-spacing-3) var(--ds-spacing-4)",
  menu: "var(--ds-spacing-1)",
  rich: "var(--ds-spacing-5) var(--ds-spacing-6)",
};

const BASE_STYLE: React.CSSProperties = {
  position: "fixed",
  backgroundColor: "var(--ds-surface-overlay)",
  color: "var(--ds-text-primary)",
  border: "1px solid var(--ds-border-default)",
  borderRadius: "var(--ds-radius-popover)",
  boxShadow: "var(--ds-shadow-lg)",
  zIndex: "var(--ds-z-popover)" as unknown as number,
  outline: "none",
};

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  PopoverContentProps
>(function PopoverContent(
  {
    className,
    style,
    variant = "default",
    size = "md",
    side = "bottom",
    align = "start",
    sideOffset = 8,
    children,
    "aria-label": ariaLabel,
    ...rest
  },
  ref,
) {
  const ctx = useCtx("PopoverContent");
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const [coord, setCoord] = React.useState<
    { top: number; left: number } | null
  >(null);

  React.useEffect(() => {
    if (!ctx.open) return;
    const compute = () => {
      const t = ctx.triggerRef.current;
      const c = localRef.current;
      if (t && c) setCoord(pos(t, c, side, align, sideOffset));
    };
    const id = window.requestAnimationFrame(() => {
      compute();
      const c = localRef.current;
      if (c) {
        const f = Array.from(
          c.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        (f[0] ?? c).focus();
      }
    });
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
    };
  }, [ctx.open, ctx.triggerRef, side, align, sideOffset]);

  React.useEffect(() => {
    if (!ctx.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        ctx.setOpen(false);
        ctx.triggerRef.current?.focus();
      }
    };
    const onDown = (event: MouseEvent) => {
      const c = localRef.current;
      const t = ctx.triggerRef.current;
      const tg = event.target as Node | null;
      if (!tg) return;
      if (c?.contains(tg) || t?.contains(tg)) return;
      ctx.setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
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
      role="dialog"
      aria-label={ariaLabel}
      tabIndex={-1}
      className={cn(popoverContentVariants({ variant, size }), className)}
      style={{
        ...BASE_STYLE,
        ...SIZE_STYLE[size],
        padding: VARIANT_PADDING[variant],
        ...(coord
          ? { top: coord.top, left: coord.left }
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

const HEADER_STYLE: React.CSSProperties = {
  fontSize: "var(--ds-font-size-body-md)",
  fontWeight: "var(--ds-font-weight-semibold)",
  color: "var(--ds-text-primary)",
  marginBottom: "var(--ds-spacing-2)",
};
const FOOTER_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--ds-spacing-2)",
  marginTop: "var(--ds-spacing-3)",
  paddingTop: "var(--ds-spacing-3)",
  borderTop: "1px solid var(--ds-border-subtle)",
};

export const PopoverHeader = React.forwardRef<
  HTMLDivElement,
  PopoverHeaderProps
>(function PopoverHeader({ className, style, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ ...HEADER_STYLE, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});

export const PopoverFooter = React.forwardRef<
  HTMLDivElement,
  PopoverFooterProps
>(function PopoverFooter({ className, style, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{ ...FOOTER_STYLE, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});

export const PopoverClose = React.forwardRef<
  HTMLButtonElement,
  PopoverCloseProps
>(function PopoverClose({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useCtx("PopoverClose");
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setOpen(false);
      }}
      {...rest}
    >
      {children ?? "Close"}
    </Comp>
  );
});
