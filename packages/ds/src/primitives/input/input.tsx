"use client";

/**
 * @ds/core/primitives/input
 *
 * Form input with label / description / error slots, icon + add-on slots,
 * loading and clearable affordances. Builds `aria-describedby` from the
 * description + error ids so SR users get both pieces of context.
 */

import { forwardRef, useCallback, useRef, useState } from "react";
import type { ChangeEvent, ForwardedRef, MouseEvent } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { useComposedRefs } from "../../utils/compose-refs";
import { useId } from "../../utils/id";

import { inputElementVariants, inputRootVariants } from "./input.variants";
import type { InputProps } from "./input.types";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    variant,
    size,
    type = "text",
    label,
    description,
    error,
    iconLeft,
    iconRight,
    prefix,
    suffix,
    loading = false,
    clearable = false,
    valid,
    required,
    disabled,
    id,
    className,
    containerClassName,
    onChange,
    value,
    defaultValue,
    ...rest
  }: InputProps,
  ref: ForwardedRef<HTMLInputElement>,
) {
  const reactId = useId("ds-input");
  const inputId = id ?? reactId;
  const descId = description ? `${inputId}-desc` : undefined;
  const errId = error ? `${inputId}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  const invalid = Boolean(error);

  const innerRef = useRef<HTMLInputElement>(null);
  const composedRef = useComposedRefs(ref, innerRef);

  const [hasValue, setHasValue] = useState(() => {
    if (value !== undefined && value !== null) return String(value).length > 0;
    if (defaultValue !== undefined && defaultValue !== null)
      return String(defaultValue).length > 0;
    return false;
  });

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setHasValue(event.target.value.length > 0);
      onChange?.(event);
    },
    [onChange],
  );

  const handleClear = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const node = innerRef.current;
      if (!node) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(node, "");
      node.dispatchEvent(new Event("input", { bubbles: true }));
      setHasValue(false);
      node.focus();
    },
    [],
  );

  const showClear = clearable && hasValue && !disabled && !loading;

  return (
    <div className={cn("flex w-full flex-col gap-[var(--ds-spacing-1_5)]", containerClassName)}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cn(
            "text-[length:var(--ds-font-size-body-sm)]",
            "font-[var(--ds-font-weight-body-md,500)]",
            "text-[color:var(--ds-text-primary)]",
            "inline-flex items-center gap-[var(--ds-spacing-1)]",
          )}
        >
          {label}
          {required ? (
            <span
              aria-hidden="true"
              className="text-[color:var(--ds-status-danger-fg)]"
            >
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div
        data-invalid={invalid || undefined}
        data-valid={(valid && !invalid) || undefined}
        data-disabled={disabled || undefined}
        className={cn(
          inputRootVariants({
            variant,
            size,
            invalid,
            valid: Boolean(valid && !invalid),
            disabled: Boolean(disabled),
          }),
          className,
        )}
      >
        {iconLeft ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center",
              "pr-[var(--ds-spacing-2)]",
              "text-[color:var(--ds-icon-muted)]",
              "[&_svg]:h-[16px] [&_svg]:w-[16px]",
            )}
          >
            {iconLeft}
          </span>
        ) : null}

        {prefix ? (
          <span
            className={cn(
              "shrink-0 pr-[var(--ds-spacing-2)]",
              "text-[color:var(--ds-text-muted)]",
              "text-[length:var(--ds-font-size-body-sm)]",
            )}
          >
            {prefix}
          </span>
        ) : null}

        <input
          ref={composedRef}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          className={inputElementVariants()}
          {...rest}
        />

        {suffix ? (
          <span
            className={cn(
              "shrink-0 pl-[var(--ds-spacing-2)]",
              "text-[color:var(--ds-text-muted)]",
              "text-[length:var(--ds-font-size-body-sm)]",
            )}
          >
            {suffix}
          </span>
        ) : null}

        {showClear ? (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Clear field"
            className={cn(
              "ml-[var(--ds-spacing-1)] shrink-0",
              "inline-flex h-[18px] w-[18px] items-center justify-center",
              "rounded-[var(--ds-radius-full)]",
              "text-[color:var(--ds-icon-muted)]",
              "hover:text-[color:var(--ds-text-primary)]",
              "transition-colors duration-[var(--ds-motion-duration-fast,150ms)]",
            )}
          >
            <X className="h-[12px] w-[12px]" aria-hidden="true" />
          </button>
        ) : null}

        {loading ? (
          <span
            aria-hidden="true"
            className={cn(
              "ml-[var(--ds-spacing-2)] inline-flex shrink-0 items-center",
              "text-[color:var(--ds-icon-muted)]",
            )}
          >
            <Loader2 className="h-[16px] w-[16px] animate-spin motion-reduce:animate-none" />
          </span>
        ) : iconRight ? (
          <span
            aria-hidden="true"
            className={cn(
              "ml-[var(--ds-spacing-2)] flex shrink-0 items-center",
              "text-[color:var(--ds-icon-muted)]",
              "[&_svg]:h-[16px] [&_svg]:w-[16px]",
            )}
          >
            {iconRight}
          </span>
        ) : invalid ? (
          <span
            aria-hidden="true"
            className={cn(
              "ml-[var(--ds-spacing-2)] inline-flex shrink-0 items-center",
              "text-[color:var(--ds-status-danger-fg)]",
            )}
          >
            <AlertCircle className="h-[16px] w-[16px]" />
          </span>
        ) : valid ? (
          <span
            aria-hidden="true"
            className={cn(
              "ml-[var(--ds-spacing-2)] inline-flex shrink-0 items-center",
              "text-[color:var(--ds-status-success-fg)]",
            )}
          >
            <CheckCircle2 className="h-[16px] w-[16px]" />
          </span>
        ) : null}
      </div>

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
});

Input.displayName = "Input";
