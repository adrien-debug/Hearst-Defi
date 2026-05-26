"use client";

/**
 * @ds/core/primitives/checkbox
 *
 * Token-styled wrapper over `@radix-ui/react-checkbox`. Two layout variants
 * (`default` inline / `card` whole-row clickable), three sizes, plus a real
 * `indeterminate` state that survives the controlled / uncontrolled split.
 */

import * as RxCheckbox from "@radix-ui/react-checkbox";
import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { Check, Minus } from "lucide-react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";

import {
  checkboxControlVariants,
  checkboxRootVariants,
} from "./checkbox.variants";
import type { CheckboxProps } from "./checkbox.types";

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  function Checkbox(
    {
      variant,
      size,
      label,
      description,
      checked,
      defaultChecked,
      onCheckedChange,
      indeterminate,
      invalid,
      disabled,
      id,
      className,
      rootClassName,
      ...rest
    }: CheckboxProps,
    ref: ForwardedRef<HTMLButtonElement>,
  ) {
    const reactId = useId("ds-checkbox");
    const cbId = id ?? reactId;
    const descId = description ? `${cbId}-desc` : undefined;

    const resolvedChecked =
      indeterminate
        ? ("indeterminate" as const)
        : checked;

    return (
      <label
        htmlFor={cbId}
        data-disabled={disabled || undefined}
        className={cn(
          checkboxRootVariants({ variant, disabled: Boolean(disabled) }),
          rootClassName,
        )}
      >
        <RxCheckbox.Root
          ref={ref}
          id={cbId}
          checked={resolvedChecked}
          defaultChecked={defaultChecked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
          data-invalid={invalid || undefined}
          aria-describedby={descId}
          aria-invalid={invalid || undefined}
          className={cn(checkboxControlVariants({ size }), className)}
          {...rest}
        >
          <RxCheckbox.Indicator asChild>
            <span aria-hidden="true" className="inline-flex">
              {resolvedChecked === "indeterminate" ? <Minus /> : <Check />}
            </span>
          </RxCheckbox.Indicator>
        </RxCheckbox.Root>

        {label || description ? (
          <span className="flex flex-col gap-[var(--ds-spacing-0_5)]">
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
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
