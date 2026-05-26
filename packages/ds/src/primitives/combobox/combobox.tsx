"use client";

/**
 * @ds/core/primitives/combobox
 *
 * Searchable combobox. Single or multi-select. Built on Radix Popover + a
 * custom listbox. Implements:
 *   - keyboard: ↑/↓ to navigate, Enter to select, Escape to close, Backspace
 *     to remove the last badge in multi mode when the query is empty
 *   - optional creatable mode (Enter on an unmatched query)
 *   - aria-combobox / listbox / option semantics
 */

import * as RxPopover from "@radix-ui/react-popover";
import {
  forwardRef,
  useCallback,
  useEffect,
  useId as useReactId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ForwardedRef,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from "react";
import { AlertCircle, ChevronDown, Loader2, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { useId } from "../../utils/id";
import { useControllableState } from "../../utils/controllable";

import {
  comboBadgeClasses,
  comboOptionClasses,
  comboPopoverClasses,
  comboTriggerVariants,
} from "./combobox.variants";
import type {
  ComboboxOption,
  ComboboxProps,
} from "./combobox.types";

function getSearch(opt: ComboboxOption): string {
  return (opt.searchText ?? String(opt.label)).toLowerCase();
}

export const Combobox = forwardRef<HTMLInputElement, ComboboxProps>(
  function Combobox(props: ComboboxProps, ref: ForwardedRef<HTMLInputElement>) {
    const {
      options,
      size,
      placeholder,
      label,
      description,
      error,
      disabled,
      required,
      id,
      className,
      triggerClassName,
      loading,
      emptyMessage = "No matches",
      creatable,
      maxHeight,
      onCreate,
    } = props;
    const multi = props.multi === true;

    const reactId = useId("ds-combo");
    const componentId = id ?? reactId;
    const listboxId = useReactId();
    const descId = description ? `${componentId}-desc` : undefined;
    const errId = error ? `${componentId}-err` : undefined;
    const describedBy = [descId, errId].filter(Boolean).join(" ") || undefined;
    const invalid = Boolean(error);

    // Controllable value: normalize to readonly string[] internally.
    const initialMulti = useMemo<readonly string[]>(() => {
      if (multi) {
        const m = props as { defaultValue?: readonly string[]; value?: readonly string[] };
        return m.value ?? m.defaultValue ?? [];
      }
      const s = props as { defaultValue?: string; value?: string };
      const v = s.value ?? s.defaultValue;
      return v !== undefined ? [v] : [];
    }, [multi, props]);

    const [selected, setSelected] = useState<readonly string[]>(initialMulti);

    const isControlled = (multi
      ? (props as { value?: readonly string[] }).value !== undefined
      : (props as { value?: string }).value !== undefined);

    // Keep in sync if controlled.
    useEffect(() => {
      if (!isControlled) return;
      if (multi) {
        const v = (props as { value?: readonly string[] }).value ?? [];
        setSelected(v);
      } else {
        const v = (props as { value?: string }).value;
        setSelected(v !== undefined ? [v] : []);
      }
    }, [isControlled, multi, props]);

    const emit = useCallback(
      (next: readonly string[]) => {
        if (!isControlled) setSelected(next);
        if (multi) {
          (props as { onChange?: (v: readonly string[]) => void }).onChange?.(next);
        } else {
          (props as { onChange?: (v: string | undefined) => void }).onChange?.(
            next[0],
          );
        }
      },
      [isControlled, multi, props],
    );

    const [open, setOpen] = useControllableState<boolean>({
      defaultProp: false,
      onChange: () => {},
    });
    const isOpen = open ?? false;

    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return options;
      return options.filter((o) => getSearch(o).includes(q));
    }, [options, query]);

    useEffect(() => {
      setActiveIndex(0);
    }, [query, isOpen]);

    const isSelected = useCallback(
      (value: string) => selected.includes(value),
      [selected],
    );

    const toggleValue = useCallback(
      (value: string) => {
        if (multi) {
          const next = isSelected(value)
            ? selected.filter((v) => v !== value)
            : [...selected, value];
          emit(next);
        } else {
          emit([value]);
          setOpen(false);
        }
      },
      [emit, isSelected, multi, selected, setOpen],
    );

    const handleCreate = useCallback(() => {
      const q = query.trim();
      if (!q) return;
      const exists = options.some((o) => getSearch(o) === q.toLowerCase());
      if (exists) return;
      onCreate?.(q);
      if (multi) {
        emit([...selected, q]);
        setQuery("");
      } else {
        emit([q]);
        setQuery("");
        setOpen(false);
      }
    }, [emit, multi, onCreate, options, query, selected, setOpen]);

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex((i) =>
            Math.min(i + 1, Math.max(filteredOptions.length - 1, 0)),
          );
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (event.key === "Home") {
          event.preventDefault();
          setActiveIndex(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setActiveIndex(Math.max(filteredOptions.length - 1, 0));
        } else if (event.key === "Enter") {
          event.preventDefault();
          if (filteredOptions.length === 0 && creatable) {
            handleCreate();
            return;
          }
          const opt = filteredOptions[activeIndex];
          if (opt && !opt.disabled) toggleValue(opt.value);
        } else if (event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
        } else if (event.key === "Backspace") {
          if (query === "" && multi && selected.length > 0) {
            emit(selected.slice(0, -1));
          }
        }
      },
      [
        activeIndex,
        creatable,
        emit,
        filteredOptions,
        handleCreate,
        multi,
        query,
        selected,
        setOpen,
        toggleValue,
      ],
    );

    const removeBadge = useCallback(
      (value: string) => {
        if (!multi) return;
        emit(selected.filter((v) => v !== value));
      },
      [emit, multi, selected],
    );

    const labelFor = useCallback(
      (value: string): ReactNode => {
        const found = options.find((o) => o.value === value);
        return found ? found.label : value;
      },
      [options],
    );

    const displayValue = multi
      ? ""
      : selected[0] !== undefined
        ? String(labelFor(selected[0]))
        : "";

    return (
      <div className={cn("flex w-full flex-col gap-[var(--ds-spacing-1_5)]", className)}>
        {label ? (
          <label
            htmlFor={componentId}
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

        <RxPopover.Root open={isOpen} onOpenChange={(o) => setOpen(o)}>
          <RxPopover.Anchor asChild>
            <div
              data-disabled={disabled || undefined}
              data-invalid={invalid || undefined}
              data-focused={isOpen || undefined}
              className={cn(
                comboTriggerVariants({ size }),
                "flex-wrap",
                triggerClassName,
              )}
              onClick={() => {
                if (disabled) return;
                setOpen(true);
                inputRef.current?.focus();
              }}
            >
              {multi
                ? selected.map((v) => (
                    <span key={v} className={comboBadgeClasses}>
                      <span className="truncate">{labelFor(v)}</span>
                      {!disabled ? (
                        <button
                          type="button"
                          aria-label={`Remove ${String(labelFor(v))}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBadge(v);
                          }}
                          className={cn(
                            "inline-flex items-center justify-center",
                            "rounded-[var(--ds-radius-full)]",
                            "h-[14px] w-[14px]",
                            "text-[color:var(--ds-icon-muted)]",
                            "hover:text-[color:var(--ds-text-primary)]",
                          )}
                        >
                          <X aria-hidden="true" className="h-[10px] w-[10px]" />
                        </button>
                      ) : null}
                    </span>
                  ))
                : null}

              <input
                ref={(node) => {
                  inputRef.current = node;
                  if (typeof ref === "function") ref(node);
                  else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
                }}
                id={componentId}
                role="combobox"
                type="text"
                autoComplete="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={isOpen}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                aria-required={required || undefined}
                placeholder={
                  multi && selected.length > 0
                    ? ""
                    : (placeholder ?? "")
                }
                disabled={disabled}
                value={multi ? query : (open ? query : displayValue)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "flex-1 min-w-[60px] bg-transparent outline-none border-0",
                  "placeholder:text-[color:var(--ds-input-placeholder)]",
                )}
              />

              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto inline-flex shrink-0 items-center",
                  "text-[color:var(--ds-icon-muted)]",
                )}
              >
                {loading ? (
                  <Loader2 className="h-[16px] w-[16px] animate-spin motion-reduce:animate-none" />
                ) : (
                  <ChevronDown
                    className={cn(
                      "h-[16px] w-[16px] transition-transform",
                      "duration-[var(--ds-motion-duration-fast,150ms)]",
                      isOpen && "rotate-180",
                    )}
                  />
                )}
              </span>
            </div>
          </RxPopover.Anchor>

          <RxPopover.Portal>
            <RxPopover.Content
              align="start"
              sideOffset={6}
              onOpenAutoFocus={(e) => e.preventDefault()}
              className={cn(
                comboPopoverClasses,
                "w-[var(--radix-popover-trigger-width)]",
              )}
            >
              <div
                role="listbox"
                id={listboxId}
                aria-multiselectable={multi || undefined}
                style={maxHeight ? { maxHeight } : { maxHeight: "260px" }}
                className="overflow-y-auto p-[var(--ds-spacing-1)]"
              >
                {filteredOptions.length === 0 ? (
                  creatable && query.trim() ? (
                    <button
                      type="button"
                      onClick={handleCreate}
                      className={cn(
                        comboOptionClasses,
                        "w-full text-left",
                        "data-[active=true]:bg-[color:var(--ds-button-ghost-bg-hover)]",
                      )}
                      data-active="true"
                    >
                      <span className="text-[color:var(--ds-text-muted)]">
                        Create
                      </span>
                      <span>“{query.trim()}”</span>
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "px-[var(--ds-spacing-2_5)] py-[var(--ds-spacing-3)]",
                        "text-[length:var(--ds-font-size-body-sm)]",
                        "text-[color:var(--ds-text-muted)]",
                      )}
                    >
                      {emptyMessage}
                    </div>
                  )
                ) : (
                  filteredOptions.map((opt, i) => {
                    const sel = isSelected(opt.value);
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={sel}
                        data-active={i === activeIndex || undefined}
                        data-selected={sel || undefined}
                        data-disabled={opt.disabled || undefined}
                        onMouseEnter={() => setActiveIndex(i)}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (!opt.disabled) toggleValue(opt.value);
                          inputRef.current?.focus();
                        }}
                        className={comboOptionClasses}
                      >
                        {multi ? (
                          <span
                            aria-hidden="true"
                            className={cn(
                              "inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center",
                              "rounded-[var(--ds-radius-xs)]",
                              "border border-solid",
                              sel
                                ? "bg-[color:var(--ds-button-primary-bg)] border-[color:var(--ds-button-primary-bg)] text-[color:var(--ds-button-primary-fg)]"
                                : "border-[color:var(--ds-input-border)]",
                            )}
                          >
                            {sel ? (
                              <svg
                                viewBox="0 0 12 12"
                                className="h-[10px] w-[10px]"
                              >
                                <path
                                  d="M2 6.5l2.5 2.5L10 3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : null}
                          </span>
                        ) : null}
                        <span className="truncate">{opt.label}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </RxPopover.Content>
          </RxPopover.Portal>
        </RxPopover.Root>

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

Combobox.displayName = "Combobox";
