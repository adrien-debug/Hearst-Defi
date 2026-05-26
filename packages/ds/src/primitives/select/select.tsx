"use client";

/**
 * @ds/core/primitives/select
 *
 * Token-styled wrapper over `@radix-ui/react-select`. Supports flat or grouped
 * options (`option.group`), inherits Radix's ARIA + keyboard correctness for
 * free, and exposes the same label / description / error contract as `Input`.
 */

import * as RxSelect from "@radix-ui/react-select";
import { forwardRef, useMemo } from "react";
import type { ForwardedRef } from "react";
import { AlertCircle, Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";

import {
  selectContentClasses,
  selectItemClasses,
  selectLabelClasses,
  selectSeparatorClasses,
  selectTriggerVariants,
} from "./select.variants";
import type { SelectOption, SelectProps } from "./select.types";

function groupOptions(
  options: ReadonlyArray<SelectOption>,
  groupOrder?: ReadonlyArray<string>,
): Array<{ key: string | null; items: ReadonlyArray<SelectOption> }> {
  const flat = options.filter((o) => !o.group);
  const byGroup = new Map<string, SelectOption[]>();
  for (const opt of options) {
    if (!opt.group) continue;
    if (!byGroup.has(opt.group)) byGroup.set(opt.group, []);
    byGroup.get(opt.group)!.push(opt);
  }
  const sections: Array<{ key: string | null; items: ReadonlyArray<SelectOption> }> = [];
  if (flat.length > 0) sections.push({ key: null, items: flat });
  const keys = groupOrder ? [...groupOrder] : [...byGroup.keys()];
  for (const k of keys) {
    const items = byGroup.get(k);
    if (items && items.length > 0) sections.push({ key: k, items });
  }
  return sections;
}

const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RxSelect.Item>
>(function SelectItem({ className, children, ...props }, ref) {
  return (
    <RxSelect.Item ref={ref} className={cn(selectItemClasses, className)} {...props}>
      <span className="flex h-[16px] w-[16px] items-center justify-center shrink-0">
        <RxSelect.ItemIndicator>
          <Check className="h-[14px] w-[14px]" aria-hidden="true" />
        </RxSelect.ItemIndicator>
      </span>
      <RxSelect.ItemText>{children}</RxSelect.ItemText>
    </RxSelect.Item>
  );
});

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    label,
    description,
    error,
    placeholder,
    options,
    groupOrder,
    size,
    value,
    defaultValue,
    onChange,
    required,
    disabled,
    name,
    id,
    className,
    triggerClassName,
  }: SelectProps,
  ref: ForwardedRef<HTMLButtonElement>,
) {
  const reactId = useId("ds-select");
  const triggerId = id ?? reactId;
  const descId = description ? `${triggerId}-desc` : undefined;
  const errId = error ? `${triggerId}-err` : undefined;
  const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);

  const sections = useMemo(
    () => groupOptions(options, groupOrder),
    [options, groupOrder],
  );

  return (
    <div className={cn("flex w-full flex-col gap-[var(--ds-spacing-1_5)]", className)}>
      {label ? (
        <label
          htmlFor={triggerId}
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

      <RxSelect.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onChange}
        required={required}
        disabled={disabled}
        name={name}
      >
        <RxSelect.Trigger
          ref={ref}
          id={triggerId}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(
            selectTriggerVariants({ size, invalid }),
            triggerClassName,
          )}
        >
          <RxSelect.Value placeholder={placeholder} />
          <RxSelect.Icon asChild>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                "h-[16px] w-[16px] shrink-0",
                "text-[color:var(--ds-icon-muted)]",
                "transition-transform duration-[var(--ds-motion-duration-fast,150ms)]",
                "data-[state=open]:rotate-180",
              )}
            />
          </RxSelect.Icon>
        </RxSelect.Trigger>

        <RxSelect.Portal>
          <RxSelect.Content
            position="popper"
            sideOffset={6}
            className={selectContentClasses}
          >
            <RxSelect.ScrollUpButton
              className={cn(
                "flex items-center justify-center py-[var(--ds-spacing-1)]",
                "text-[color:var(--ds-icon-muted)]",
              )}
            >
              <ChevronUp className="h-[14px] w-[14px]" aria-hidden="true" />
            </RxSelect.ScrollUpButton>

            <RxSelect.Viewport>
              {sections.map((section, i) => (
                <RxSelect.Group key={section.key ?? `flat-${i}`}>
                  {section.key ? (
                    <RxSelect.Label className={selectLabelClasses}>
                      {section.key}
                    </RxSelect.Label>
                  ) : null}
                  {section.items.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.disabled}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                  {i < sections.length - 1 ? (
                    <RxSelect.Separator className={selectSeparatorClasses} />
                  ) : null}
                </RxSelect.Group>
              ))}
            </RxSelect.Viewport>

            <RxSelect.ScrollDownButton
              className={cn(
                "flex items-center justify-center py-[var(--ds-spacing-1)]",
                "text-[color:var(--ds-icon-muted)]",
              )}
            >
              <ChevronDown className="h-[14px] w-[14px]" aria-hidden="true" />
            </RxSelect.ScrollDownButton>
          </RxSelect.Content>
        </RxSelect.Portal>
      </RxSelect.Root>

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

Select.displayName = "Select";
