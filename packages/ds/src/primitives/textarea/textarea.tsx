"use client";

/**
 * @ds/core/primitives/textarea
 *
 * Multi-line text input with optional auto-resize and character counter.
 * Variants and a11y mirror `Input`.
 */

import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ForwardedRef } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "../../utils/cn";
import { useComposedRefs } from "../../utils/compose-refs";
import { useId } from "../../utils/id";

import { textareaVariants } from "./textarea.variants";
import type { TextareaProps } from "./textarea.types";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      variant,
      size,
      label,
      description,
      error,
      autoResize = false,
      rows = 3,
      maxLength,
      required,
      disabled,
      id,
      className,
      containerClassName,
      onChange,
      value,
      defaultValue,
      ...rest
    }: TextareaProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ) {
    const reactId = useId("ds-textarea");
    const textareaId = id ?? reactId;
    const descId = description ? `${textareaId}-desc` : undefined;
    const errId = error ? `${textareaId}-err` : undefined;
    const counterId = maxLength ? `${textareaId}-count` : undefined;
    const describedBy =
      [descId, errId, counterId].filter(Boolean).join(" ") || undefined;

    const invalid = Boolean(error);

    const innerRef = useRef<HTMLTextAreaElement>(null);
    const composedRef = useComposedRefs(ref, innerRef);

    const initial =
      value !== undefined && value !== null
        ? String(value)
        : defaultValue !== undefined && defaultValue !== null
          ? String(defaultValue)
          : "";

    const [length, setLength] = useState(initial.length);

    const resize = useCallback(() => {
      if (!autoResize) return;
      const node = innerRef.current;
      if (!node) return;
      node.style.height = "auto";
      node.style.height = `${node.scrollHeight}px`;
    }, [autoResize]);

    useEffect(() => {
      resize();
    }, [resize, value]);

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLTextAreaElement>) => {
        setLength(event.target.value.length);
        onChange?.(event);
        resize();
      },
      [onChange, resize],
    );

    return (
      <div
        className={cn(
          "flex w-full flex-col gap-[var(--ds-spacing-1_5)]",
          containerClassName,
        )}
      >
        {label ? (
          <label
            htmlFor={textareaId}
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

        <div className="relative">
          <textarea
            ref={composedRef}
            id={textareaId}
            rows={autoResize ? 1 : rows}
            maxLength={maxLength}
            disabled={disabled}
            required={required}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-required={required || undefined}
            value={value}
            defaultValue={defaultValue}
            onChange={handleChange}
            className={cn(
              textareaVariants({ variant, size, invalid }),
              autoResize && "resize-none overflow-hidden",
              className,
            )}
            {...rest}
          />
          {maxLength ? (
            <span
              id={counterId}
              aria-live="polite"
              className={cn(
                "pointer-events-none absolute bottom-[var(--ds-spacing-1_5)] right-[var(--ds-spacing-2)]",
                "text-[length:var(--ds-font-size-body-xs)]",
                length >= maxLength
                  ? "text-[color:var(--ds-status-danger-fg)]"
                  : "text-[color:var(--ds-text-muted)]",
              )}
            >
              {length} / {maxLength}
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
  },
);

Textarea.displayName = "Textarea";
