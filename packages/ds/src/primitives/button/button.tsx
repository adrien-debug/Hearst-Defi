"use client";

/**
 * @ds/core/primitives/button
 *
 * Token-only Button primitive. Eight variants × five sizes, `asChild` Slot
 * polymorphism, `loading` with width-preserving spinner, optional leading /
 * trailing icons, AAA focus ring, `prefers-reduced-motion` respected via
 * motion tokens.
 *
 * Spec: see ./README.md and CONTRACT.md §3.
 */

import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "../../utils/cn";
import { Slot, Slottable } from "../../utils/slot";

import { buttonVariants } from "./button.variants";
import type { ButtonProps } from "./button.types";

function Spinner({ size }: { size: ButtonProps["size"] }) {
  const dim =
    size === "xs"
      ? "h-[12px] w-[12px]"
      : size === "sm"
        ? "h-[14px] w-[14px]"
        : size === "lg" || size === "xl"
          ? "h-[18px] w-[18px]"
          : "h-[16px] w-[16px]";
  return (
    <Loader2
      aria-hidden="true"
      className={cn(
        dim,
        "animate-spin",
        "motion-reduce:animate-none",
      )}
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant,
      size,
      fullWidth,
      loading = false,
      iconLeft,
      iconRight,
      asChild = false,
      disabled,
      className,
      children,
      ariaLabel,
      type,
      ...rest
    }: ButtonProps,
    ref: ForwardedRef<HTMLButtonElement>,
  ) {
    const Component = asChild ? Slot : "button";

    const isDisabled = disabled || loading;
    const computedType = asChild ? undefined : (type ?? "button");

    return (
      <Component
        ref={ref}
        type={computedType}
        disabled={asChild ? undefined : isDisabled}
        data-loading={loading || undefined}
        data-variant={variant}
        data-size={size}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        aria-label={ariaLabel}
        className={cn(
          buttonVariants({ variant, size, fullWidth, loading }),
          className,
        )}
        {...rest}
      >
        <Slottable>
          <>
            {loading ? (
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center"
              >
                <Spinner size={size} />
              </span>
            ) : iconLeft ? (
              <span
                aria-hidden="true"
                className="inline-flex shrink-0 items-center"
              >
                {iconLeft}
              </span>
            ) : null}
            {children !== undefined && children !== null ? (
              <span
                className={cn(
                  "inline-flex items-center",
                  loading && "opacity-[var(--ds-opacity-loading,0.8)]",
                )}
              >
                {children}
              </span>
            ) : null}
            {!loading && iconRight ? (
              <span
                aria-hidden="true"
                className="inline-flex shrink-0 items-center"
              >
                {iconRight}
              </span>
            ) : null}
          </>
        </Slottable>
      </Component>
    );
  },
);

Button.displayName = "Button";
