"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";
import { Slot } from "@ds/utils/slot";

import type {
  CardDescriptionProps,
  CardProps,
  CardSectionProps,
  CardTitleProps,
  CardPadding,
  CardRadius,
  CardVariant,
} from "./card.types";
import { cardVariants } from "./card.variants";

/* -------------------------------------------------------------------------- */
/*  Token resolvers — every visual decision flows through CSS vars.            */
/* -------------------------------------------------------------------------- */

const RADIUS_VAR: Record<CardRadius, string> = {
  sm: "var(--ds-radius-md)",
  md: "var(--ds-radius-lg)",
  lg: "var(--ds-radius-card)",
  xl: "var(--ds-radius-3xl)",
};

const PADDING_VAR: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--ds-spacing-3)",
  md: "var(--ds-spacing-5)",
  lg: "var(--ds-spacing-8)",
};

const VARIANT_STYLE: Record<CardVariant, React.CSSProperties> = {
  default: {
    backgroundColor: "var(--ds-surface-raised)",
    color: "var(--ds-text-primary)",
    border: "1px solid var(--ds-border-default)",
    boxShadow: "var(--ds-shadow-xs, none)",
  },
  elevated: {
    backgroundColor: "var(--ds-surface-raised)",
    color: "var(--ds-text-primary)",
    border: "1px solid var(--ds-border-subtle)",
    boxShadow: "var(--ds-shadow-md)",
  },
  outlined: {
    backgroundColor: "transparent",
    color: "var(--ds-text-primary)",
    border: "1px solid var(--ds-border-strong)",
    boxShadow: "none",
  },
  filled: {
    backgroundColor: "var(--ds-bg-muted)",
    color: "var(--ds-text-primary)",
    border: "1px solid transparent",
    boxShadow: "none",
  },
  glass: {
    backgroundColor: "var(--ds-glass-bg)",
    color: "var(--ds-text-primary)",
    border: "1px solid var(--ds-glass-border)",
    backdropFilter: "blur(var(--ds-glass-blur))",
    WebkitBackdropFilter: "blur(var(--ds-glass-blur))",
    boxShadow: "var(--ds-shadow-lg)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--ds-text-primary)",
    border: "1px solid transparent",
    boxShadow: "none",
  },
};

/* -------------------------------------------------------------------------- */
/*  Root                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Card — surface container with header / body / footer composition.
 *
 * @example
 * <Card variant="elevated" interactive>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Subtitle</CardDescription>
 *   </CardHeader>
 *   <CardContent>…</CardContent>
 *   <CardFooter>…</CardFooter>
 * </Card>
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    asChild = false,
    className,
    variant = "default",
    padding = "md",
    radius = "lg",
    interactive = false,
    style,
    onKeyDown,
    children,
    ...rest
  },
  ref,
) {
  const Comp: React.ElementType = asChild ? Slot : "div";
  const v: CardVariant = variant ?? "default";
  const p: CardPadding = (padding ?? "md") as CardPadding;
  const r: CardRadius = (radius ?? "lg") as CardRadius;

  const mergedStyle: React.CSSProperties = {
    ...VARIANT_STYLE[v],
    borderRadius: RADIUS_VAR[r],
    padding: PADDING_VAR[p],
    ...style,
  };

  // a11y: when interactive, expose as a focusable, keyboard-activatable region.
  const interactiveProps = interactive
    ? {
        role: rest.role ?? "button",
        tabIndex: rest.tabIndex ?? 0,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (
            (event.key === "Enter" || event.key === " ") &&
            event.currentTarget === event.target
          ) {
            event.preventDefault();
            event.currentTarget.click();
          }
          onKeyDown?.(event);
        },
      }
    : { onKeyDown };

  return (
    <Comp
      ref={ref}
      className={cn(cardVariants({ variant, padding, radius, interactive }), className)}
      style={mergedStyle}
      {...interactiveProps}
      {...rest}
    >
      {children}
    </Comp>
  );
});

/* -------------------------------------------------------------------------- */
/*  Sections                                                                   */
/* -------------------------------------------------------------------------- */

const SECTION_GAP_STYLE: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--ds-spacing-1)",
};

const HEADER_STYLE: React.CSSProperties = {
  ...SECTION_GAP_STYLE,
  marginBottom: "var(--ds-spacing-4)",
};

const FOOTER_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--ds-spacing-3)",
  marginTop: "var(--ds-spacing-4)",
  paddingTop: "var(--ds-spacing-4)",
  borderTop: "1px solid var(--ds-border-subtle)",
};

const CONTENT_STYLE: React.CSSProperties = {
  display: "block",
  color: "var(--ds-text-secondary)",
};

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  function CardHeader({ className, style, children, ...rest }, ref) {
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

export const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  function CardContent({ className, style, children, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{ ...CONTENT_STYLE, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  function CardFooter({ className, style, children, ...rest }, ref) {
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

const TITLE_STYLE: React.CSSProperties = {
  fontFamily: "var(--ds-font-family-display, inherit)",
  fontSize: "var(--ds-font-size-heading-md, var(--ds-font-size-body-lg))",
  fontWeight: "var(--ds-font-weight-semibold)",
  lineHeight: "var(--ds-line-height-tight, 1.2)",
  letterSpacing: "var(--ds-letter-spacing-tight, -0.01em)",
  color: "var(--ds-text-primary)",
  margin: 0,
};

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({ as = "h3", className, style, children, ...rest }, ref) {
    const Tag = as;
    return (
      <Tag
        ref={ref}
        className={cn(className)}
        style={{ ...TITLE_STYLE, ...style }}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);

const DESCRIPTION_STYLE: React.CSSProperties = {
  fontSize: "var(--ds-font-size-body-sm)",
  color: "var(--ds-text-secondary)",
  lineHeight: "var(--ds-line-height-relaxed, 1.55)",
  margin: 0,
};

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(function CardDescription({ className, style, children, ...rest }, ref) {
  return (
    <p
      ref={ref}
      className={cn(className)}
      style={{ ...DESCRIPTION_STYLE, ...style }}
      {...rest}
    >
      {children}
    </p>
  );
});
