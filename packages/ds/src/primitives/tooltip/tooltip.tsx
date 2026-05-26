"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";

import type {
  TooltipAlign,
  TooltipProps,
  TooltipSide,
  TooltipSize,
} from "./tooltip.types";
import { tooltipVariants } from "./tooltip.variants";

const SIZE_STYLE: Record<TooltipSize, React.CSSProperties> = {
  sm: {
    padding: "var(--ds-spacing-1) var(--ds-spacing-2)",
    fontSize: "var(--ds-font-size-micro)",
    maxWidth: "200px",
  },
  md: {
    padding: "var(--ds-spacing-1_5) var(--ds-spacing-2_5)",
    fontSize: "var(--ds-font-size-caption)",
    maxWidth: "260px",
  },
  lg: {
    padding: "var(--ds-spacing-2) var(--ds-spacing-3)",
    fontSize: "var(--ds-font-size-body-sm)",
    maxWidth: "320px",
  },
};

const BASE_STYLE: React.CSSProperties = {
  position: "fixed",
  backgroundColor: "var(--ds-surface-inverse, var(--ds-text-primary))",
  color: "var(--ds-text-inverse, var(--ds-surface-base))",
  borderRadius: "var(--ds-radius-tooltip)",
  boxShadow: "var(--ds-shadow-md)",
  zIndex: "var(--ds-z-tooltip)" as unknown as number,
  pointerEvents: "none",
  lineHeight: "var(--ds-line-height-snug, 1.35)",
};

function position(
  trigger: HTMLElement,
  content: HTMLElement,
  side: TooltipSide,
  align: TooltipAlign,
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
  left = Math.max(4, Math.min(left, window.innerWidth - cw - 4));
  top = Math.max(4, Math.min(top, window.innerHeight - ch - 4));
  return { top, left };
}

/**
 * Tooltip — wraps a single child. Shows on hover/focus, hides on leave/blur/escape.
 *
 * @example
 * <Tooltip content="Save (⌘S)">
 *   <Button>Save</Button>
 * </Tooltip>
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 300,
  closeDelay = 0,
  sideOffset = 6,
  size = "md",
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled,
  className,
}: TooltipProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (v: boolean) => setOpenState(v),
    [setOpenState],
  );
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const showTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const id = useId("ds-tooltip");

  const clearTimers = () => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };

  const handleShow = () => {
    if (disabled) return;
    clearTimers();
    showTimer.current = setTimeout(() => setOpen(true), delayDuration);
  };
  const handleHide = () => {
    clearTimers();
    if (closeDelay > 0) {
      hideTimer.current = setTimeout(() => setOpen(false), closeDelay);
    } else {
      setOpen(false);
    }
  };

  React.useEffect(() => () => clearTimers(), []);

  React.useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;
    const compute = () => {
      const t = triggerRef.current;
      const c = contentRef.current;
      if (t && c) setPos(position(t, c, side, align, sideOffset));
    };
    const id = window.requestAnimationFrame(compute);
    window.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, side, align, sideOffset, setOpen]);

  // clone child with handlers + aria-describedby
  const setTriggerRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
    // forward existing ref on child if any
    const childRef = (children as { ref?: React.Ref<HTMLElement> }).ref;
    if (typeof childRef === "function") childRef(node);
    else if (childRef && typeof childRef === "object")
      (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };

  const childProps = children.props as React.HTMLAttributes<HTMLElement> & {
    ref?: React.Ref<HTMLElement>;
  };

  const trigger = React.cloneElement(children, {
    ref: setTriggerRef,
    "aria-describedby":
      open && content ? id : childProps["aria-describedby"],
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      handleShow();
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      handleHide();
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      handleShow();
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      handleHide();
    },
  } as React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> });

  return (
    <>
      {trigger}
      {open && content && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={contentRef}
              id={id}
              role="tooltip"
              className={cn(tooltipVariants({ size }), className)}
              style={{
                ...BASE_STYLE,
                ...SIZE_STYLE[size],
                ...(pos
                  ? { top: pos.top, left: pos.left }
                  : { top: -9999, left: -9999, opacity: 0 }),
              }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
