"use client";

/**
 * @ds/core/primitives/icon-button
 *
 * Square button optimized for a single Lucide icon. `aria-label` is
 * type-required because there is no visible text — screen readers depend on it.
 */

import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "../../utils/cn";
import { Slot } from "../../utils/slot";

import { iconButtonVariants } from "./icon-button.variants";
import type { IconButtonProps } from "./icon-button.types";

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant,
      size,
      loading = false,
      asChild = false,
      disabled,
      className,
      children,
      type,
      ...rest
    }: IconButtonProps,
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
        className={cn(
          iconButtonVariants({ variant, size, loading }),
          className,
        )}
        {...rest}
      >
        {loading ? (
          <Loader2
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          children
        )}
      </Component>
    );
  },
);

IconButton.displayName = "IconButton";
