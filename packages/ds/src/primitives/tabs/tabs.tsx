"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { useControllableState } from "@ds/utils/controllable";
import { useId } from "@ds/utils/id";

import type {
  TabsContentProps,
  TabsListProps,
  TabsOrientation,
  TabsProps,
  TabsSize,
  TabsTriggerProps,
  TabsVariant,
} from "./tabs.types";
import { tabsListVariants, tabsTriggerVariants } from "./tabs.variants";

interface Ctx {
  value: string | undefined;
  setValue: (v: string) => void;
  baseId: string;
  variant: TabsVariant;
  size: TabsSize;
  orientation: TabsOrientation;
}
const TabsCtx = React.createContext<Ctx | null>(null);
function useTabs(name: string): Ctx {
  const c = React.useContext(TabsCtx);
  if (!c) throw new Error(`<${name}/> must be inside <Tabs/>`);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  Token-based styling                                                        */
/* -------------------------------------------------------------------------- */

const SIZE_PADDING: Record<TabsSize, React.CSSProperties> = {
  sm: {
    padding: "var(--ds-spacing-1_5) var(--ds-spacing-3)",
    fontSize: "var(--ds-font-size-body-xs)",
    gap: "var(--ds-spacing-1_5)",
  },
  md: {
    padding: "var(--ds-spacing-2) var(--ds-spacing-4)",
    fontSize: "var(--ds-font-size-body-sm)",
    gap: "var(--ds-spacing-2)",
  },
  lg: {
    padding: "var(--ds-spacing-2_5) var(--ds-spacing-5)",
    fontSize: "var(--ds-font-size-body-md)",
    gap: "var(--ds-spacing-2)",
  },
};

function listStyle(
  variant: TabsVariant,
  orientation: TabsOrientation,
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    flexDirection: orientation === "vertical" ? "column" : "row",
    gap:
      variant === "pills"
        ? "var(--ds-spacing-1)"
        : variant === "underline"
        ? "var(--ds-spacing-4)"
        : 0,
  };
  if (variant === "default") {
    return {
      ...base,
      backgroundColor: "var(--ds-bg-muted)",
      padding: "var(--ds-spacing-1)",
      borderRadius: "var(--ds-radius-md)",
    };
  }
  if (variant === "underline") {
    return {
      ...base,
      borderBottom:
        orientation === "horizontal"
          ? "1px solid var(--ds-border-subtle)"
          : undefined,
      borderRight:
        orientation === "vertical"
          ? "1px solid var(--ds-border-subtle)"
          : undefined,
    };
  }
  if (variant === "enclosed") {
    return {
      ...base,
      borderBottom: "1px solid var(--ds-border-default)",
    };
  }
  return base;
}

function triggerStyle(
  variant: TabsVariant,
  size: TabsSize,
  active: boolean,
): React.CSSProperties {
  const base: React.CSSProperties = {
    ...SIZE_PADDING[size],
    display: "inline-flex",
    alignItems: "center",
    border: "1px solid transparent",
    background: "transparent",
    color: active ? "var(--ds-text-primary)" : "var(--ds-text-muted)",
    cursor: "pointer",
    transition:
      "background-color var(--ds-motion-duration-sm, 120ms), color var(--ds-motion-duration-sm, 120ms), border-color var(--ds-motion-duration-sm, 120ms)",
    fontWeight: active
      ? "var(--ds-font-weight-semibold)"
      : "var(--ds-font-weight-medium)",
    whiteSpace: "nowrap",
  };
  if (variant === "default") {
    return {
      ...base,
      borderRadius: "var(--ds-radius-sm)",
      backgroundColor: active
        ? "var(--ds-surface-raised)"
        : "transparent",
      boxShadow: active ? "var(--ds-shadow-xs, none)" : "none",
    };
  }
  if (variant === "pills") {
    return {
      ...base,
      borderRadius: "var(--ds-radius-pill)",
      backgroundColor: active ? "var(--ds-bg-accent-soft)" : "transparent",
      color: active ? "var(--ds-text-accent)" : "var(--ds-text-muted)",
    };
  }
  if (variant === "underline") {
    return {
      ...base,
      borderRadius: 0,
      borderBottom: active
        ? "2px solid var(--ds-border-accent)"
        : "2px solid transparent",
      marginBottom: -1,
    };
  }
  return {
    ...base,
    borderRadius:
      "var(--ds-radius-sm) var(--ds-radius-sm) 0 0",
    borderColor: active ? "var(--ds-border-default)" : "transparent",
    borderBottomColor: active ? "var(--ds-surface-base)" : "transparent",
    backgroundColor: active ? "var(--ds-surface-base)" : "transparent",
    marginBottom: -1,
  };
}

/* -------------------------------------------------------------------------- */
/*  Tabs root                                                                  */
/* -------------------------------------------------------------------------- */

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    value: valueProp,
    defaultValue,
    onValueChange,
    variant = "default",
    size = "md",
    orientation = "horizontal",
    tabs,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const [value, setValueState] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValue ?? tabs?.[0]?.value,
    onChange: onValueChange,
  });
  const setValue = React.useCallback(
    (v: string) => setValueState(v),
    [setValueState],
  );
  const baseId = useId("ds-tabs");

  const ctx: Ctx = { value, setValue, baseId, variant, size, orientation };

  return (
    <div
      ref={ref}
      data-orientation={orientation}
      className={cn(className)}
      style={{
        display: "flex",
        flexDirection: orientation === "vertical" ? "row" : "column",
        gap: "var(--ds-spacing-4)",
        ...style,
      }}
      {...rest}
    >
      <TabsCtx.Provider value={ctx}>
        {tabs ? (
          <>
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  disabled={t.disabled}
                  icon={t.icon}
                  badge={t.badge}
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t.value} value={t.value}>
                {t.content}
              </TabsContent>
            ))}
          </>
        ) : (
          children
        )}
      </TabsCtx.Provider>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/*  Composition                                                                */
/* -------------------------------------------------------------------------- */

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList({ className, style, children, ...rest }, ref) {
    const ctx = useTabs("TabsList");
    return (
      <div
        ref={ref}
        role="tablist"
        aria-orientation={ctx.orientation}
        className={cn(
          tabsListVariants({
            variant: ctx.variant,
            size: ctx.size,
            orientation: ctx.orientation,
          }),
          className,
        )}
        style={{ ...listStyle(ctx.variant, ctx.orientation), ...style }}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          const triggers = Array.from(
            (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>(
              '[role="tab"]:not([aria-disabled="true"])',
            ),
          );
          const idx = triggers.indexOf(document.activeElement as HTMLElement);
          const nextKey =
            ctx.orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
          const prevKey =
            ctx.orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
          if (event.key === nextKey) {
            event.preventDefault();
            triggers[(idx + 1) % triggers.length]?.focus();
          } else if (event.key === prevKey) {
            event.preventDefault();
            triggers[(idx - 1 + triggers.length) % triggers.length]?.focus();
          } else if (event.key === "Home") {
            event.preventDefault();
            triggers[0]?.focus();
          } else if (event.key === "End") {
            event.preventDefault();
            triggers[triggers.length - 1]?.focus();
          }
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

const BADGE_STYLE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "var(--ds-spacing-4)",
  padding: "0 var(--ds-spacing-1)",
  borderRadius: "var(--ds-radius-full)",
  backgroundColor: "var(--ds-bg-accent-soft)",
  color: "var(--ds-text-accent)",
  fontSize: "var(--ds-font-size-micro)",
  fontWeight: "var(--ds-font-weight-semibold)",
  marginLeft: "var(--ds-spacing-1)",
};

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(function TabsTrigger(
  {
    value,
    icon,
    badge,
    children,
    className,
    style,
    disabled,
    onClick,
    ...rest
  },
  ref,
) {
  const ctx = useTabs("TabsTrigger");
  const active = ctx.value === value;
  const id = `${ctx.baseId}-trigger-${value}`;
  const panelId = `${ctx.baseId}-panel-${value}`;
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={panelId}
      aria-disabled={disabled || undefined}
      tabIndex={active ? 0 : -1}
      disabled={disabled}
      data-state={active ? "active" : "inactive"}
      className={cn(
        tabsTriggerVariants({ variant: ctx.variant, size: ctx.size, active }),
        className,
      )}
      style={{ ...triggerStyle(ctx.variant, ctx.size, active), ...style }}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (!disabled) ctx.setValue(value);
      }}
      {...rest}
    >
      {icon ? (
        <span aria-hidden style={{ display: "inline-flex" }}>
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
      {badge ? <span style={BADGE_STYLE}>{badge}</span> : null}
    </button>
  );
});

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  function TabsContent(
    { value, className, style, children, forceMount, ...rest },
    ref,
  ) {
    const ctx = useTabs("TabsContent");
    const active = ctx.value === value;
    if (!active && !forceMount) return null;
    const id = `${ctx.baseId}-panel-${value}`;
    const triggerId = `${ctx.baseId}-trigger-${value}`;
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={id}
        aria-labelledby={triggerId}
        hidden={!active}
        tabIndex={0}
        className={cn(className)}
        style={{
          outline: "none",
          color: "var(--ds-text-primary)",
          ...style,
        }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
