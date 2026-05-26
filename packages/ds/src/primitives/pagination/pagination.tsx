"use client";

import * as React from "react";

import { cn } from "@ds/utils/cn";

import type { PaginationProps } from "./pagination.types";

type Token = number | "...";

function buildRange(
  page: number,
  totalPages: number,
  siblings: number,
): Token[] {
  if (totalPages <= 1) return [1];
  const first = 1;
  const last = totalPages;
  const left = Math.max(first + 1, page - siblings);
  const right = Math.min(last - 1, page + siblings);
  const items: Token[] = [first];
  if (left > first + 1) items.push("...");
  for (let p = left; p <= right; p++) items.push(p);
  if (right < last - 1) items.push("...");
  if (last !== first) items.push(last);
  return items;
}

const itemBase =
  "ds-inline-flex ds-items-center ds-justify-center ds-min-w-[var(--ds-spacing-8)] ds-h-[var(--ds-spacing-8)] ds-px-[var(--ds-spacing-2)] ds-rounded-[var(--ds-radius-md)] ds-text-[var(--ds-font-size-body-sm)] ds-font-medium ds-transition-colors ds-select-none";

const itemDefault =
  "ds-text-[var(--ds-text-secondary)] hover:ds-bg-[var(--ds-bg-muted)] focus-visible:ds-outline focus-visible:ds-outline-2 focus-visible:ds-outline-[var(--ds-color-focus-ring)]";

const itemActive =
  "ds-bg-[var(--ds-button-primary-bg)] ds-text-[var(--ds-button-primary-fg)] hover:ds-bg-[var(--ds-button-primary-bg)]";

const itemDisabled =
  "ds-opacity-50 ds-cursor-not-allowed ds-pointer-events-none";

export const Pagination = React.forwardRef<HTMLElement, PaginationProps>(
  function Pagination(
    {
      className,
      page,
      totalPages,
      onChange,
      siblings = 1,
      variant = "default",
      label = "Pagination",
      ...rest
    },
    ref,
  ) {
    const safePage = Math.max(1, Math.min(totalPages, page));
    const goto = (p: number) => {
      if (p < 1 || p > totalPages || p === safePage) return;
      onChange(p);
    };

    if (variant === "minimal") {
      return (
        <nav
          ref={ref}
          aria-label={label}
          className={cn(
            "ds-inline-flex ds-items-center ds-gap-[var(--ds-spacing-2)]",
            className,
          )}
          {...rest}
        >
          <button
            type="button"
            className={cn(itemBase, itemDefault, safePage === 1 && itemDisabled)}
            onClick={() => goto(safePage - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span
            aria-current="page"
            className="ds-text-[var(--ds-text-primary)] ds-text-[var(--ds-font-size-body-sm)]"
          >
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            className={cn(
              itemBase,
              itemDefault,
              safePage === totalPages && itemDisabled,
            )}
            onClick={() => goto(safePage + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </nav>
      );
    }

    if (variant === "dots") {
      return (
        <nav
          ref={ref}
          aria-label={label}
          className={cn(
            "ds-inline-flex ds-items-center ds-gap-[var(--ds-spacing-1_5)]",
            className,
          )}
          {...rest}
        >
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const active = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => goto(p)}
                aria-label={`Page ${p}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "ds-rounded-[var(--ds-radius-full)] ds-transition-all",
                  active
                    ? "ds-w-[var(--ds-spacing-5)] ds-h-[var(--ds-spacing-2)] ds-bg-[var(--ds-color-accent-500)]"
                    : "ds-w-[var(--ds-spacing-2)] ds-h-[var(--ds-spacing-2)] ds-bg-[var(--ds-border-strong)] hover:ds-bg-[var(--ds-text-muted)]",
                )}
              />
            );
          })}
        </nav>
      );
    }

    const tokens = buildRange(safePage, totalPages, siblings);

    return (
      <nav
        ref={ref}
        aria-label={label}
        className={cn(
          "ds-inline-flex ds-items-center ds-gap-[var(--ds-spacing-1)]",
          className,
        )}
        {...rest}
      >
        <button
          type="button"
          className={cn(itemBase, itemDefault, safePage === 1 && itemDisabled)}
          onClick={() => goto(safePage - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {tokens.map((tok, i) =>
          tok === "..." ? (
            <span
              key={`e${i}`}
              aria-hidden
              className="ds-px-[var(--ds-spacing-1)] ds-text-[var(--ds-text-muted)]"
            >
              …
            </span>
          ) : (
            <button
              key={tok}
              type="button"
              className={cn(itemBase, tok === safePage ? itemActive : itemDefault)}
              aria-current={tok === safePage ? "page" : undefined}
              aria-label={`Page ${tok}`}
              onClick={() => goto(tok)}
            >
              {tok}
            </button>
          ),
        )}
        <button
          type="button"
          className={cn(
            itemBase,
            itemDefault,
            safePage === totalPages && itemDisabled,
          )}
          onClick={() => goto(safePage + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </nav>
    );
  },
);
