"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";
import { Slot } from "@ds/utils/slot";

import type {
  SheetBodyProps,
  SheetCloseProps,
  SheetContentProps,
  SheetFooterProps,
  SheetHandleProps,
  SheetHeaderProps,
  SheetProps,
  SheetTitleProps,
  SheetTriggerProps,
} from "./sheet.types";
import { sheetContentVariants } from "./sheet.variants";

const DEFAULT_SNAP_POINTS: readonly number[] = [0.5];
const DEFAULT_MOBILE_BP = 640;

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  snapPoints: number[];
  snapIndex: number;
  setSnapIndex: (i: number) => void;
  dismissible: boolean;
  titleId: string;
  isMobile: boolean;
}
const Ctx = React.createContext<Ctx | null>(null);
function useCtx(name: string): Ctx {
  const v = React.useContext(Ctx);
  if (!v) throw new Error(`<${name}/> must be inside <Sheet/>`);
  return v;
}

/* -------------------------------------------------------------------------- */
/*  Mobile viewport detection                                                  */
/* -------------------------------------------------------------------------- */

function useIsMobile(threshold: number): boolean {
  const [mobile, setMobile] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth < threshold;
  });
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setMobile(window.innerWidth < threshold);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [threshold]);
  return mobile;
}

export function Sheet({
  open: openProp,
  defaultOpen,
  onOpenChange,
  snapPoints: snapPointsProp,
  defaultSnapIndex,
  dismissible = true,
  mobileBreakpoint = DEFAULT_MOBILE_BP,
  children,
}: SheetProps): React.JSX.Element {
  const snapPoints = React.useMemo(
    () => [...(snapPointsProp ?? DEFAULT_SNAP_POINTS)],
    [snapPointsProp],
  );
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (v: boolean) => setOpenState(v),
    [setOpenState],
  );
  const initialSnap =
    defaultSnapIndex !== undefined
      ? Math.min(Math.max(defaultSnapIndex, 0), snapPoints.length - 1)
      : snapPoints.length - 1;
  const [snapIndex, setSnapIndex] = React.useState(initialSnap);
  const titleId = useId("ds-sheet-title");
  const isMobile = useIsMobile(mobileBreakpoint);
  return (
    <Ctx.Provider
      value={{
        open: open ?? false,
        setOpen,
        snapPoints,
        snapIndex,
        setSnapIndex,
        dismissible,
        titleId,
        isMobile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  SheetTriggerProps
>(function SheetTrigger({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useCtx("SheetTrigger");
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) ctx.setOpen(true);
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

const BACKDROP_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "var(--ds-overlay-scrim)",
  zIndex: "var(--ds-z-modal-backdrop)" as unknown as number,
};

function sheetStyle(
  isMobile: boolean,
  snapFraction: number,
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    backgroundColor: "var(--ds-surface-overlay)",
    color: "var(--ds-text-primary)",
    border: "1px solid var(--ds-border-default)",
    boxShadow: "var(--ds-shadow-xl)",
    zIndex: "var(--ds-z-modal)" as unknown as number,
    display: "flex",
    flexDirection: "column",
    transition:
      "height var(--ds-motion-duration-md, 220ms) var(--ds-motion-ease-emphasized, ease-out)",
  };
  if (isMobile) {
    return {
      ...base,
      bottom: 0,
      left: 0,
      right: 0,
      width: "100vw",
      height: `${Math.min(Math.max(snapFraction, 0.1), 1) * 100}dvh`,
      borderTopLeftRadius: "var(--ds-radius-3xl)",
      borderTopRightRadius: "var(--ds-radius-3xl)",
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      borderBottomWidth: 0,
    };
  }
  // desktop → behaves as Modal sm
  return {
    ...base,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "min(420px, calc(100vw - var(--ds-spacing-8)))",
    maxHeight: "calc(100dvh - var(--ds-spacing-12))",
    borderRadius: "var(--ds-radius-modal)",
  };
}

const FOCUSABLE_SEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  function SheetContent(
    { className, style, children, "aria-label": ariaLabel, ...rest },
    ref,
  ) {
    const ctx = useCtx("SheetContent");
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const previousFocus = React.useRef<HTMLElement | null>(null);

    React.useEffect(() => {
      if (ctx.open) {
        previousFocus.current = document.activeElement as HTMLElement | null;
        const id = window.requestAnimationFrame(() => {
          const node = localRef.current;
          if (!node) return;
          const f = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
          (f[0] ?? node).focus();
        });
        return () => window.cancelAnimationFrame(id);
      }
      previousFocus.current?.focus();
      return;
    }, [ctx.open]);

    React.useEffect(() => {
      if (!ctx.open) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape" && ctx.dismissible) {
          event.stopPropagation();
          ctx.setOpen(false);
        }
      };
      document.addEventListener("keydown", onKey);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = prev;
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

    const snap = ctx.snapPoints[ctx.snapIndex] ?? ctx.snapPoints[0] ?? 0.5;

    return createPortal(
      <>
        <div
          aria-hidden
          style={BACKDROP_STYLE}
          onClick={ctx.dismissible ? () => ctx.setOpen(false) : undefined}
        />
        <div
          ref={setRefs}
          role="dialog"
          aria-modal
          aria-labelledby={ariaLabel ? undefined : ctx.titleId}
          aria-label={ariaLabel}
          tabIndex={-1}
          className={cn(
            sheetContentVariants({
              desktopBehavior: ctx.isMobile ? "sheet" : "modal",
            }),
            className,
          )}
          style={{ ...sheetStyle(ctx.isMobile, snap), ...style }}
          {...rest}
        >
          {children}
        </div>
      </>,
      document.body,
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  Handle — drag to snap                                                      */
/* -------------------------------------------------------------------------- */

const HANDLE_WRAP_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: "var(--ds-spacing-2) 0 var(--ds-spacing-1)",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
};
const HANDLE_BAR_STYLE: React.CSSProperties = {
  width: "var(--ds-spacing-10)",
  height: "var(--ds-spacing-1)",
  borderRadius: "var(--ds-radius-pill)",
  backgroundColor: "var(--ds-border-strong)",
};

export const SheetHandle = React.forwardRef<HTMLDivElement, SheetHandleProps>(
  function SheetHandle({ className, style, ...rest }, ref) {
    const ctx = useCtx("SheetHandle");
    const startY = React.useRef<number | null>(null);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
      if (!ctx.isMobile) return;
      startY.current = event.clientY;
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    };
    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
      if (startY.current === null) return;
      const delta = event.clientY - startY.current; // positive = down
      startY.current = null;
      const threshold = 40;
      if (delta > threshold) {
        if (ctx.snapIndex > 0) {
          ctx.setSnapIndex(ctx.snapIndex - 1);
        } else if (ctx.dismissible) {
          ctx.setOpen(false);
        }
      } else if (delta < -threshold) {
        if (ctx.snapIndex < ctx.snapPoints.length - 1) {
          ctx.setSnapIndex(ctx.snapIndex + 1);
        }
      }
    };

    if (!ctx.isMobile) return null;

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Drag handle"
        className={cn(className)}
        style={{ ...HANDLE_WRAP_STYLE, ...style }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          startY.current = null;
        }}
        {...rest}
      >
        <div aria-hidden style={HANDLE_BAR_STYLE} />
      </div>
    );
  },
);

const HEADER_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-3) var(--ds-spacing-6) var(--ds-spacing-2)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-1)",
};
const BODY_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-2) var(--ds-spacing-6) var(--ds-spacing-4)",
  flex: 1,
  overflowY: "auto",
  color: "var(--ds-text-secondary)",
};
const FOOTER_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-3) var(--ds-spacing-6) var(--ds-spacing-6)",
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--ds-spacing-2)",
  borderTop: "1px solid var(--ds-border-subtle)",
};
const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--ds-font-size-heading-md, var(--ds-font-size-body-lg))",
  fontWeight: "var(--ds-font-weight-semibold)",
  color: "var(--ds-text-primary)",
};

export const SheetHeader = React.forwardRef<HTMLDivElement, SheetHeaderProps>(
  function SheetHeader({ className, style, children, ...rest }, ref) {
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
  },
);

export const SheetBody = React.forwardRef<HTMLDivElement, SheetBodyProps>(
  function SheetBody({ className, style, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{ ...BODY_STYLE, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export const SheetFooter = React.forwardRef<HTMLDivElement, SheetFooterProps>(
  function SheetFooter({ className, style, children, ...rest }, ref) {
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
  },
);

export const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  function SheetTitle(
    { as = "h2", className, style, children, id, ...rest },
    ref,
  ) {
    const ctx = useCtx("SheetTitle");
    const Tag = as;
    return (
      <Tag
        ref={ref}
        id={id ?? ctx.titleId}
        className={cn(className)}
        style={{ ...TITLE_STYLE, ...style }}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);

export const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  function SheetClose({ asChild, onClick, children, ...rest }, ref) {
    const ctx = useCtx("SheetClose");
    const Comp: React.ElementType = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : "button"}
        aria-label={rest["aria-label"] ?? "Close"}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          if (!event.defaultPrevented) ctx.setOpen(false);
        }}
        {...rest}
      >
        {children ?? "Close"}
      </Comp>
    );
  },
);
