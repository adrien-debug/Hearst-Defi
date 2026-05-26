"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";
import { Slot } from "@ds/utils/slot";

import type {
  ModalBodyProps,
  ModalCloseProps,
  ModalContentProps,
  ModalDescriptionProps,
  ModalFooterProps,
  ModalHeaderProps,
  ModalProps,
  ModalSize,
  ModalTitleProps,
  ModalTriggerProps,
  ModalVariant,
} from "./modal.types";
import { modalContentVariants } from "./modal.variants";

/* -------------------------------------------------------------------------- */
/*  Context                                                                    */
/* -------------------------------------------------------------------------- */

interface ModalContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  closeOnEscape: boolean;
  closeOnBackdrop: boolean;
  restoreFocus: boolean;
}

const ModalContext = React.createContext<ModalContextValue | null>(null);

function useModalContext(component: string): ModalContextValue {
  const ctx = React.useContext(ModalContext);
  if (!ctx) {
    throw new Error(`<${component}/> must be rendered inside <Modal/>`);
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({
  open: openProp,
  defaultOpen,
  onOpenChange,
  closeOnEscape = true,
  closeOnBackdrop = true,
  restoreFocus = true,
  children,
}: ModalProps): React.JSX.Element {
  const [open, setOpenState] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const setOpen = React.useCallback(
    (next: boolean) => setOpenState(next),
    [setOpenState],
  );

  const titleId = useId("ds-modal-title");
  const descriptionId = useId("ds-modal-desc");

  const value: ModalContextValue = {
    open: open ?? false,
    setOpen,
    titleId,
    descriptionId,
    closeOnEscape,
    closeOnBackdrop,
    restoreFocus,
  };

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trigger                                                                    */
/* -------------------------------------------------------------------------- */

export const ModalTrigger = React.forwardRef<
  HTMLButtonElement,
  ModalTriggerProps
>(function ModalTrigger({ asChild, onClick, children, ...rest }, ref) {
  const { setOpen } = useModalContext("ModalTrigger");
  const Comp: React.ElementType = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : "button"}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(true);
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/* -------------------------------------------------------------------------- */
/*  Focus trap helpers                                                         */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.hasAttribute("data-ds-focus-skip"));
}

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

const BACKDROP_STYLE: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "var(--ds-overlay-modal-backdrop)",
  backdropFilter: "blur(var(--ds-overlay-blur, 0px))",
  zIndex: "var(--ds-z-modal-backdrop)" as unknown as number,
  animation:
    "ds-modal-fade-in var(--ds-motion-duration-base, 180ms) var(--ds-motion-ease-out, ease-out)",
};

const POSITIONER_STYLE: Record<ModalVariant, React.CSSProperties> = {
  default: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "var(--ds-spacing-12) var(--ds-spacing-4)",
    zIndex: "var(--ds-z-modal)" as unknown as number,
  },
  centered: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "var(--ds-spacing-4)",
    zIndex: "var(--ds-z-modal)" as unknown as number,
  },
  "sheet-bottom": {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    padding: 0,
    zIndex: "var(--ds-z-modal)" as unknown as number,
  },
};

const SIZE_MAXWIDTH: Record<ModalSize, string> = {
  sm: "min(420px, calc(100vw - var(--ds-spacing-8)))",
  md: "min(560px, calc(100vw - var(--ds-spacing-8)))",
  lg: "min(720px, calc(100vw - var(--ds-spacing-8)))",
  xl: "min(960px, calc(100vw - var(--ds-spacing-8)))",
  full: "calc(100vw - var(--ds-spacing-4))",
};

const CONTENT_BASE_STYLE: React.CSSProperties = {
  width: "100%",
  backgroundColor: "var(--ds-surface-overlay)",
  color: "var(--ds-text-primary)",
  border: "1px solid var(--ds-border-default)",
  borderRadius: "var(--ds-radius-modal)",
  boxShadow: "var(--ds-shadow-xl)",
  animation:
    "ds-modal-slide-up var(--ds-motion-duration-md, 240ms) var(--ds-motion-ease-emphasized, cubic-bezier(0.2,0,0,1))",
};

export const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  function ModalContent(
    {
      className,
      style,
      size = "md",
      variant = "default",
      children,
      "aria-label": ariaLabel,
      ...rest
    },
    ref,
  ) {
    const ctx = useModalContext("ModalContent");
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const previousFocus = React.useRef<HTMLElement | null>(null);

    // restore focus on close
    React.useEffect(() => {
      if (ctx.open) {
        previousFocus.current = document.activeElement as HTMLElement | null;
        // focus first focusable in modal
        const id = window.requestAnimationFrame(() => {
          const node = localRef.current;
          if (!node) return;
          const focusables = getFocusable(node);
          (focusables[0] ?? node).focus();
        });
        return () => window.cancelAnimationFrame(id);
      }
      if (ctx.restoreFocus && previousFocus.current) {
        previousFocus.current.focus();
      }
      return;
    }, [ctx.open, ctx.restoreFocus]);

    // escape + focus trap
    React.useEffect(() => {
      if (!ctx.open) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape" && ctx.closeOnEscape) {
          event.stopPropagation();
          ctx.setOpen(false);
          return;
        }
        if (event.key === "Tab") {
          const node = localRef.current;
          if (!node) return;
          const focusables = getFocusable(node);
          if (focusables.length === 0) {
            event.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (!first || !last) return;
          const active = document.activeElement as HTMLElement | null;
          if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
          }
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }, [ctx]);

    // body scroll lock
    React.useEffect(() => {
      if (!ctx.open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [ctx.open]);

    if (!ctx.open) return null;
    if (typeof document === "undefined") return null;

    const setRefs = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const contentStyle: React.CSSProperties = {
      ...CONTENT_BASE_STYLE,
      maxWidth: SIZE_MAXWIDTH[size],
      ...(variant === "sheet-bottom"
        ? {
            borderTopLeftRadius: "var(--ds-radius-3xl)",
            borderTopRightRadius: "var(--ds-radius-3xl)",
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            maxWidth: "100vw",
          }
        : null),
      ...(size === "full"
        ? { height: "calc(100dvh - var(--ds-spacing-12))" }
        : null),
      ...style,
    };

    return createPortal(
      <>
        <div
          aria-hidden
          style={BACKDROP_STYLE}
          onClick={
            ctx.closeOnBackdrop ? () => ctx.setOpen(false) : undefined
          }
        />
        <div style={POSITIONER_STYLE[variant]}>
          <div
            ref={setRefs}
            role="dialog"
            aria-modal
            aria-labelledby={ariaLabel ? undefined : ctx.titleId}
            aria-describedby={ctx.descriptionId}
            aria-label={ariaLabel}
            tabIndex={-1}
            className={cn(modalContentVariants({ size, variant }), className)}
            style={contentStyle}
            {...rest}
          >
            {children}
          </div>
        </div>
      </>,
      document.body,
    );
  },
);

/* -------------------------------------------------------------------------- */
/*  Sections                                                                   */
/* -------------------------------------------------------------------------- */

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-1)",
  padding: "var(--ds-spacing-6) var(--ds-spacing-6) var(--ds-spacing-2)",
  borderBottom: "1px solid var(--ds-border-subtle)",
};

const BODY_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-6)",
  overflowY: "auto",
  color: "var(--ds-text-secondary)",
};

const FOOTER_STYLE: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--ds-spacing-2)",
  padding: "var(--ds-spacing-4) var(--ds-spacing-6) var(--ds-spacing-6)",
  borderTop: "1px solid var(--ds-border-subtle)",
};

const TITLE_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--ds-font-size-heading-md, var(--ds-font-size-body-lg))",
  fontWeight: "var(--ds-font-weight-semibold)",
  color: "var(--ds-text-primary)",
  lineHeight: "var(--ds-line-height-tight, 1.2)",
};

const DESCRIPTION_STYLE: React.CSSProperties = {
  margin: 0,
  fontSize: "var(--ds-font-size-body-sm)",
  color: "var(--ds-text-secondary)",
};

export const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  function ModalHeader({ className, style, children, ...rest }, ref) {
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

export const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  function ModalBody({ className, style, children, ...rest }, ref) {
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

export const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  function ModalFooter({ className, style, children, ...rest }, ref) {
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

export const ModalTitle = React.forwardRef<HTMLHeadingElement, ModalTitleProps>(
  function ModalTitle({ as = "h2", className, style, children, id, ...rest }, ref) {
    const ctx = useModalContext("ModalTitle");
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

export const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  ModalDescriptionProps
>(function ModalDescription(
  { className, style, children, id, ...rest },
  ref,
) {
  const ctx = useModalContext("ModalDescription");
  return (
    <p
      ref={ref}
      id={id ?? ctx.descriptionId}
      className={cn(className)}
      style={{ ...DESCRIPTION_STYLE, ...style }}
      {...rest}
    >
      {children}
    </p>
  );
});

export const ModalClose = React.forwardRef<HTMLButtonElement, ModalCloseProps>(
  function ModalClose({ asChild, onClick, children, ...rest }, ref) {
    const ctx = useModalContext("ModalClose");
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
  },
);
