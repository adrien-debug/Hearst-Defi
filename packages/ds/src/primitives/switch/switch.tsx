"use client";

/**
 * @ds/core/primitives/switch
 *
 * Toggle switch over `@radix-ui/react-switch`. Three sizes, configurable
 * label position (`left` for settings rows, `right` for inline forms).
 */

import * as RxSwitch from "@radix-ui/react-switch";
import { forwardRef } from "react";
import type { ForwardedRef } from "react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";

import {
  switchControlVariants,
  switchRowVariants,
  switchThumbVariants,
} from "./switch.variants";
import type { SwitchProps } from "./switch.types";

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  {
    size,
    labelPosition,
    label,
    description,
    disabled,
    id,
    className,
    rootClassName,
    ...rest
  }: SwitchProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const reactId = useId("ds-switch");
  const sId = id ?? reactId;
  const descId = description ? `${sId}-desc` : undefined;

  return (
    <label
      htmlFor={sId}
      data-disabled={disabled || undefined}
      className={cn(
        switchRowVariants({ labelPosition, disabled: Boolean(disabled) }),
        rootClassName,
      )}
    >
      {label || description ? (
        <span className="flex flex-col gap-[var(--ds-spacing-0_5)] min-w-0 flex-1">
          {label ? (
            <span
              className={cn(
                "text-[length:var(--ds-font-size-body-sm)]",
                "text-[color:var(--ds-text-primary)]",
                "leading-[var(--ds-font-line-height-tight,1.3)]",
              )}
            >
              {label}
            </span>
          ) : null}
          {description ? (
            <span
              id={descId}
              className={cn(
                "text-[length:var(--ds-font-size-body-xs)]",
                "text-[color:var(--ds-text-muted)]",
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
      ) : null}

      <RxSwitch.Root
        ref={ref}
        id={sId}
        disabled={disabled}
        aria-describedby={descId}
        className={cn(switchControlVariants({ size }), className)}
        {...rest}
      >
        <RxSwitch.Thumb className={switchThumbVariants({ size })} />
      </RxSwitch.Root>
    </label>
  );
});

Switch.displayName = "Switch";
