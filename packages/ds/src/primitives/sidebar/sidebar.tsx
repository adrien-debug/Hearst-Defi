"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";

import type {
  SidebarBodyProps,
  SidebarFooterProps,
  SidebarHeaderProps,
  SidebarItemProps,
  SidebarProps,
  SidebarSectionProps,
  SidebarSeparatorProps,
  SidebarVariant,
} from "./sidebar.types";
import { sidebarVariants } from "./sidebar.variants";

interface Ctx {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  variant: SidebarVariant;
}
const SidebarCtx = React.createContext<Ctx | null>(null);
function useSidebar(name: string): Ctx {
  const c = React.useContext(SidebarCtx);
  if (!c) throw new Error(`<${name}/> must be inside <Sidebar/>`);
  return c;
}

const DEFAULT_EXPANDED = 240;
const DEFAULT_COLLAPSED = 64;

function rootStyle(
  collapsed: boolean,
  variant: SidebarVariant,
  expanded: number,
  collapsedWidth: number,
): React.CSSProperties {
  const base: React.CSSProperties = {
    width: collapsed ? `${collapsedWidth}px` : `${expanded}px`,
    backgroundColor:
      variant === "floating"
        ? "var(--ds-surface-overlay)"
        : "var(--ds-surface-raised)",
    color: "var(--ds-text-primary)",
    borderRight:
      variant === "floating" ? "none" : "1px solid var(--ds-border-subtle)",
    transition:
      "width var(--ds-motion-duration-md, 220ms) var(--ds-motion-ease-emphasized, ease-out)",
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  };
  if (variant === "floating") {
    return {
      ...base,
      borderRadius: "var(--ds-radius-xl)",
      boxShadow: "var(--ds-shadow-lg)",
      margin: "var(--ds-spacing-3)",
    };
  }
  if (variant === "inset") {
    return {
      ...base,
      borderRadius: "var(--ds-radius-lg)",
      margin: "var(--ds-spacing-2)",
      border: "1px solid var(--ds-border-subtle)",
    };
  }
  return base;
}

export const Sidebar = React.forwardRef<HTMLElement, SidebarProps>(
  function Sidebar(
    {
      collapsed: collapsedProp,
      defaultCollapsed,
      onCollapsedChange,
      expandedWidth = DEFAULT_EXPANDED,
      collapsedWidth = DEFAULT_COLLAPSED,
      variant = "default",
      className,
      style,
      children,
      "aria-label": ariaLabel = "Sidebar",
      ...rest
    },
    ref,
  ) {
    const [collapsed, setCollapsedState] = useControllableState<boolean>({
      prop: collapsedProp,
      defaultProp: defaultCollapsed ?? false,
      onChange: onCollapsedChange,
    });
    const setCollapsed = React.useCallback(
      (v: boolean) => setCollapsedState(v),
      [setCollapsedState],
    );
    return (
      <aside
        ref={ref}
        aria-label={ariaLabel}
        data-collapsed={collapsed ?? false}
        className={cn(
          sidebarVariants({ collapsed: collapsed ?? false, variant }),
          className,
        )}
        style={{
          ...rootStyle(
            collapsed ?? false,
            variant,
            expandedWidth,
            collapsedWidth,
          ),
          ...style,
        }}
        {...rest}
      >
        <SidebarCtx.Provider
          value={{ collapsed: collapsed ?? false, setCollapsed, variant }}
        >
          {children}
        </SidebarCtx.Provider>
      </aside>
    );
  },
);

const HEADER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ds-spacing-2)",
  padding: "var(--ds-spacing-4)",
  minHeight: "var(--ds-spacing-14)",
  borderBottom: "1px solid var(--ds-border-subtle)",
};
const BODY_STYLE: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "var(--ds-spacing-2) 0",
};
const FOOTER_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-3) var(--ds-spacing-4)",
  borderTop: "1px solid var(--ds-border-subtle)",
};
const SECTION_TITLE_STYLE: React.CSSProperties = {
  padding: "var(--ds-spacing-2) var(--ds-spacing-4) var(--ds-spacing-1)",
  fontSize: "var(--ds-font-size-caption)",
  textTransform: "uppercase",
  letterSpacing: "var(--ds-letter-spacing-wide, 0.06em)",
  color: "var(--ds-text-muted)",
  fontWeight: "var(--ds-font-weight-semibold)",
};
const SEPARATOR_STYLE: React.CSSProperties = {
  height: 1,
  backgroundColor: "var(--ds-border-subtle)",
  margin: "var(--ds-spacing-2) var(--ds-spacing-3)",
};

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  SidebarHeaderProps
>(function SidebarHeader({ className, style, children, ...rest }, ref) {
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

export const SidebarBody = React.forwardRef<HTMLDivElement, SidebarBodyProps>(
  function SidebarBody({ className, style, children, ...rest }, ref) {
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

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  SidebarFooterProps
>(function SidebarFooter({ className, style, children, ...rest }, ref) {
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

export const SidebarSection = React.forwardRef<
  HTMLDivElement,
  SidebarSectionProps
>(function SidebarSection({ title, className, style, children, ...rest }, ref) {
  const ctx = useSidebar("SidebarSection");
  return (
    <div ref={ref} className={cn(className)} style={style} {...rest}>
      {title && !ctx.collapsed ? (
        <div style={SECTION_TITLE_STYLE}>{title}</div>
      ) : null}
      {children}
    </div>
  );
});

export const SidebarSeparator = React.forwardRef<
  HTMLDivElement,
  SidebarSeparatorProps
>(function SidebarSeparator({ className, style, ...rest }, ref) {
  return (
    <div
      ref={ref}
      role="separator"
      className={cn(className)}
      style={{ ...SEPARATOR_STYLE, ...style }}
      {...rest}
    />
  );
});

function itemStyle(active: boolean, disabled: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: "var(--ds-spacing-3)",
    padding: "var(--ds-spacing-2) var(--ds-spacing-4)",
    margin: "0 var(--ds-spacing-2)",
    borderRadius: "var(--ds-radius-md)",
    fontSize: "var(--ds-font-size-body-sm)",
    fontWeight: active
      ? "var(--ds-font-weight-semibold)"
      : "var(--ds-font-weight-medium)",
    color: active
      ? "var(--ds-text-accent)"
      : disabled
      ? "var(--ds-text-faint)"
      : "var(--ds-text-secondary)",
    backgroundColor: active ? "var(--ds-bg-accent-soft)" : "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    minHeight: "var(--ds-spacing-9)",
    textDecoration: "none",
    outline: "none",
    transition:
      "background-color var(--ds-motion-duration-sm, 120ms), color var(--ds-motion-duration-sm, 120ms)",
  };
}

const ICON_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "var(--ds-spacing-5)",
  height: "var(--ds-spacing-5)",
};

const LABEL_STYLE: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const BADGE_STYLE: React.CSSProperties = {
  fontSize: "var(--ds-font-size-micro)",
  padding: "0 var(--ds-spacing-1_5)",
  borderRadius: "var(--ds-radius-full)",
  backgroundColor: "var(--ds-bg-accent-soft)",
  color: "var(--ds-text-accent)",
  minWidth: "var(--ds-spacing-4)",
  textAlign: "center",
  fontWeight: "var(--ds-font-weight-semibold)",
};

export const SidebarItem = React.forwardRef<HTMLElement, SidebarItemProps>(
  function SidebarItem(
    {
      icon,
      label,
      active = false,
      badge,
      href,
      onClick,
      disabled = false,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const ctx = useSidebar("SidebarItem");
    const Comp: React.ElementType = href ? "a" : "button";
    const merged: React.CSSProperties = {
      ...itemStyle(active, disabled),
      width: "auto",
      ...style,
    };
    return (
      <Comp
        ref={ref as React.Ref<HTMLElement>}
        href={href}
        type={href ? undefined : "button"}
        aria-current={active ? "page" : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          if (disabled) {
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        className={cn(className)}
        style={merged}
        title={ctx.collapsed && typeof label === "string" ? label : undefined}
        {...rest}
      >
        {icon ? (
          <span aria-hidden style={ICON_STYLE}>
            {icon}
          </span>
        ) : null}
        {!ctx.collapsed ? <span style={LABEL_STYLE}>{label}</span> : null}
        {!ctx.collapsed && badge ? <span style={BADGE_STYLE}>{badge}</span> : null}
      </Comp>
    );
  },
);
