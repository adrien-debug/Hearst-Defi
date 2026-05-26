"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";
import { Slot } from "@ds/utils/slot";

import type {
  DrawerBodyProps,
  DrawerCloseProps,
  DrawerContentProps,
  DrawerFooterProps,
  DrawerHeaderProps,
  DrawerProps,
  DrawerSide,
  DrawerSize,
  DrawerTitleProps,
  DrawerTriggerProps,
} from "./drawer.types";
import { drawerContentVariants } from "./drawer.variants";

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  titleId: string;
  dismissible: boolean;
}
const DrawerContext = React.createContext<Ctx | null>(null);
function useCtx(name: string): Ctx {
  const c = React.useContext(DrawerContext);
  if (!c) throw new Error(`<${name}/> must be inside <Drawer/>`);
  return c;
}

export function Drawer({
  open: openProp,
  defaultOpen,
  onOpenChange,
  dismissible = true,
  children,
}: DrawerProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (next: boolean) => setOpenState(next),
    [setOpenState],
  );
  const titleId = useId("ds-drawer-title");
  return (
    <DrawerContext.Provider
      value={{ open: open ?? false, setOpen, titleId, dismissible }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export const DrawerTrigger = React.forwardRef<
  HTMLButtonElement,
  DrawerTriggerProps
>(function DrawerTrigger({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useCtx("DrawerTrigger");
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

const SIZE_PX: Record<DrawerSize, string> = {
  sm: "min(280px, 90vw)",
  md: "min(360px, 90vw)",
  lg: "min(480px, 95vw)",
  xl: "min(640px, 95vw)",
  full: "100vw",
};
const SIZE_PX_VERT: Record<DrawerSize, string> = {
  sm: "min(220px, 60vh)",
  md: "min(320px, 70vh)",
  lg: "min(440px, 80vh)",
  xl: "min(560px, 90vh)",
  full: "100vh",
};

function positionStyle(side: DrawerSide, size: DrawerSize): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "fixed",
    backgroundColor: "var(--ds-surface-overlay)",
    color: "var(--ds-text-primary)",
    borderColor: "var(--ds-border-default)",
    borderStyle: "solid",
    borderWidth: 0,
    boxShadow: "var(--ds-shadow-xl)",
    zIndex: "var(--ds-z-drawer)" as unknown as number,
    display: "flex",
    flexDirection: "column",
  };
  if (side === "left") {
    return {
      ...base,
      top: 0,
      left: 0,
      height: "100dvh",
      width: SIZE_PX[size],
      borderRightWidth: 1,
      borderTopRightRadius: "var(--ds-radius-xl)",
      borderBottomRightRadius: "var(--ds-radius-xl)",
    };
  }
  if (side === "right") {
    return {
      ...base,
      top: 0,
      right: 0,
      height: "100dvh",
      width: SIZE_PX[size],
      borderLeftWidth: 1,
      borderTopLeftRadius: "var(--ds-radius-xl)",
      borderBottomLeftRadius: "var(--ds-radius-xl)",
    };
  }
  if (side === "top") {
    return {
      ...base,
      top: 0,
      left: 0,
      width: "100vw",
      height: SIZE_PX_VERT[size],
      borderBottomWidth: 1,
      borderBottomLeftRadius: "var(--ds-radius-xl)",
      borderBottomRightRadius: "var(--ds-radius-xl)",
    };
  }
  return {
    ...base,
    bottom: 0,
    left: 0,
    width: "100vw",
    height: SIZE_PX_VERT[size],
    borderTopWidth: 1,
    borderTopLeftRadius: "var(--ds-radius-xl)",
    borderTopRightRadius: "var(--ds-radius-xl)",
  };
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export const DrawerContent = React.forwardRef<
  HTMLDivElement,
  DrawerContentProps
>(function DrawerContent(
  {
    className,
    style,
    side = "right",
    size = "md",
    children,
    "aria-label": ariaLabel,
    ...rest
  },
  ref,
) {
  const ctx = useCtx("DrawerContent");
  const localRef = React.useRef<HTMLDivElement | null>(null);
  const previousFocus = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (ctx.open) {
      previousFocus.current = document.activeElement as HTMLElement | null;
      const id = window.requestAnimationFrame(() => {
        const node = localRef.current;
        if (!node) return;
        const f = Array.from(
          node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
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
    return () => document.removeEventListener("keydown", onKey);
  }, [ctx]);

  if (!ctx.open) return null;
  if (typeof document === "undefined") return null;

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

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
        className={cn(drawerContentVariants({ side, size }), className)}
        style={{ ...positionStyle(side, size), ...style }}
        {...rest}
      >
        {children}
      </div>
    </>,
    document.body,
  );
});

const HEADER_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-5) var(--ds-spacing-6)",
  borderBottom: "1px solid var(--ds-border-subtle)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-1)",
};
const BODY_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-5) var(--ds-spacing-6)",
  flex: 1,
  overflowY: "auto",
  color: "var(--ds-text-secondary)",
};
const FOOTER_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-4) var(--ds-spacing-6)",
  borderTop: "1px solid var(--ds-border-subtle)",
  display: "flex",
  gap: "var(--ds-spacing-2)",
  justifyContent: "flex-end",
};
const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--ds-font-size-heading-md, var(--ds-font-size-body-lg))",
  fontWeight: "var(--ds-font-weight-semibold)",
  color: "var(--ds-text-primary)",
};

export const DrawerHeader = React.forwardRef<HTMLDivElement, DrawerHeaderProps>(
  function DrawerHeader({ className, style, children, ...rest }, ref) {
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

export const DrawerBody = React.forwardRef<HTMLDivElement, DrawerBodyProps>(
  function DrawerBody({ className, style, children, ...rest }, ref) {
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

export const DrawerFooter = React.forwardRef<HTMLDivElement, DrawerFooterProps>(
  function DrawerFooter({ className, style, children, ...rest }, ref) {
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

export const DrawerTitle = React.forwardRef<
  HTMLHeadingElement,
  DrawerTitleProps
>(function DrawerTitle(
  { as = "h2", className, style, children, id, ...rest },
  ref,
) {
  const ctx = useCtx("DrawerTitle");
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
});

export const DrawerClose = React.forwardRef<
  HTMLButtonElement,
  DrawerCloseProps
>(function DrawerClose({ asChild, onClick, children, ...rest }, ref) {
  const ctx = useCtx("DrawerClose");
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
      {children ?? "×"}
    </Comp>
  );
});
