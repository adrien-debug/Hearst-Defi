"use client";

/**
 * @ds/core/primitives/radio
 *
 * `<RadioGroup>` and `<Radio>` built on `@radix-ui/react-radio-group`.
 * Two layout variants (`default` / `card`), three sizes, vertical or
 * horizontal orientation. Same label / description / error pattern as Input.
 */

import * as RxRadio from "@radix-ui/react-radio-group";
import { forwardRef } from "react";
import type { ForwardedRef } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";

import {
  radioControlVariants,
  radioGroupVariants,
  radioIndicatorVariants,
  radioRowVariants,
} from "./radio.variants";
import type { RadioGroupProps, RadioProps } from "./radio.types";

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  function RadioGroup(
    {
      label,
      description,
      error,
      orientation,
      className,
      containerClassName,
      children,
      ...rest
    }: RadioGroupProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const reactId = useId("ds-radio-group");
    const descId = description ? `${reactId}-desc` : undefined;
    const errId = error ? `${reactId}-err` : undefined;
    const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
    const invalid = Boolean(error);

    return (
      <div
        className={cn(
          "flex w-full flex-col gap-[var(--ds-spacing-2)]",
          containerClassName,
        )}
      >
        {label ? (
          <span
            id={`${reactId}-label`}
            className={cn(
              "text-[length:var(--ds-font-size-body-sm)]",
              "font-[var(--ds-font-weight-body-md,500)]",
              "text-[color:var(--ds-text-primary)]",
            )}
          >
            {label}
          </span>
        ) : null}

        <RxRadio.Root
          ref={ref}
          aria-labelledby={label ? `${reactId}-label` : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(radioGroupVariants({ orientation }), className)}
          {...rest}
        >
          {children}
        </RxRadio.Root>

        {description && !error ? (
          <p
            id={descId}
            className={cn(
              "text-[length:var(--ds-font-size-body-sm)]",
              "text-[color:var(--ds-text-muted)]",
            )}
          >
            {description}
          </p>
        ) : null}

        {error ? (
          <p
            id={errId}
            role="alert"
            className={cn(
              "inline-flex items-center gap-[var(--ds-spacing-1)]",
              "text-[length:var(--ds-font-size-body-sm)]",
              "text-[color:var(--ds-status-danger-fg)]",
            )}
          >
            <AlertCircle aria-hidden="true" className="h-[14px] w-[14px]" />
            <span>{error}</span>
          </p>
        ) : null}
      </div>
    );
  },
);

RadioGroup.displayName = "RadioGroup";

export const Radio = forwardRef<HTMLButtonElement, RadioProps>(function Radio(
  {
    variant,
    size,
    value,
    label,
    description,
    disabled,
    id,
    className,
    rootClassName,
    ...rest
  }: RadioProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const reactId = useId("ds-radio");
  const rId = id ?? reactId;
  const descId = description ? `${rId}-desc` : undefined;

  return (
    <label
      htmlFor={rId}
      data-disabled={disabled || undefined}
      className={cn(
        radioRowVariants({ variant, disabled: Boolean(disabled) }),
        rootClassName,
      )}
    >
      <RxRadio.Item
        ref={ref}
        id={rId}
        value={value}
        disabled={disabled}
        aria-describedby={descId}
        className={cn(radioControlVariants({ size }), className)}
        {...rest}
      >
        <RxRadio.Indicator className={radioIndicatorVariants({ size })} />
      </RxRadio.Item>

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
});

Radio.displayName = "Radio";
