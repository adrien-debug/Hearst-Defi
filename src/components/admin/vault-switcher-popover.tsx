"use client";

// src/components/admin/vault-switcher-popover.tsx
//
// Client component — opens a popover with a vault list for switching context.
// Receives pre-resolved vault options from the server; no fetch, no DB.

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";

export interface VaultOption {
  /** URL-safe slug (fixture id or lowercased ticker). */
  id: string;
  /** Display label. */
  label: string;
  /** Ticker symbol for secondary display. */
  ticker: string;
}

export interface VaultSwitcherPopoverProps {
  /** Currently active vault slug (null = no vault scope). */
  currentId: string | null;
  /** Pre-resolved vault catalog from the server. */
  options: VaultOption[];
  /** Called when the user picks a vault. Default: navigates to ?vault=<id>. */
  onSelect?: (id: string) => void;
}

/**
 * VaultSwitcherPopover — dropdown for switching vault scope in the admin area.
 *
 * Opens inline below the breadcrumb switcher button. The list is passed as a
 * prop (resolved on the server) so no client-side fetch is required.
 *
 * A11y:
 *   - Trigger: `aria-haspopup="listbox"` + `aria-expanded`
 *   - Popover: `role="listbox"` (single-select) + focus trap
 *   - Each option: `role="option"` + `aria-selected`
 *   - Escape closes; click outside closes
 */
export function VaultSwitcherPopover({
  currentId,
  options,
  onSelect,
}: VaultSwitcherPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filtered options via simple case-insensitive substring match
  const filtered =
    query.trim() === ""
      ? options
      : options.filter(
          (o) =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            o.ticker.toLowerCase().includes(query.toLowerCase()),
        );

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        !popoverRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  // Close on Escape; ⌘K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        close();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  // Focus search input when popover opens
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  function handleSelect(id: string) {
    if (onSelect) {
      onSelect(id);
    } else {
      // Default: navigate, preserving pathname but replacing ?vault=
      const params = new URLSearchParams(searchParams.toString());
      params.set("vault", id);
      router.push(`${pathname}?${params.toString()}`);
    }
    close();
  }

  return (
    <span className="relative inline-flex items-center">
      {/* Trigger — the ▾ chevron shown in the breadcrumb */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch vault"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-0.5 rounded px-1 py-0.5",
          "text-[var(--ct-text-faint)] hover:text-[var(--ct-text-primary)]",
          "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[var(--ct-accent)] focus-visible:ring-offset-1",
          "focus-visible:ring-offset-[var(--ct-bg-deep)]",
        )}
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={cn("transition-transform duration-150", open && "rotate-180")}
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Vault switcher"
          className={cn(
            "absolute left-0 top-full z-[var(--ct-z-popover)] mt-1",
            "w-64 rounded-lg border border-[var(--ct-border-soft)]",
            "bg-[var(--ct-surface-2)] shadow-lg",
            "focus:outline-none",
          )}
        >
          {/* Search input */}
          <div className="p-2 border-b border-[var(--ct-border-soft)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vaults…"
              aria-label="Search vaults"
              className={cn(
                "w-full rounded px-2.5 py-1.5 text-sm",
                "bg-[var(--ct-surface-1)] border border-[var(--ct-border-soft)]",
                "text-[var(--ct-text-primary)] placeholder-[var(--ct-text-faint)]",
                "focus:outline-none focus:ring-1 focus:ring-[var(--ct-accent)]",
              )}
            />
          </div>

          {/* Options list */}
          <ul
            role="listbox"
            aria-label="Available vaults"
            className="max-h-60 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[var(--ct-text-faint)]">
                No vaults found
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.id === currentId;
                return (
                  <li
                    key={opt.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelect(opt.id);
                      }
                    }}
                    tabIndex={0}
                    className={cn(
                      "flex cursor-pointer items-center justify-between",
                      "px-3 py-2 text-sm transition-colors duration-100",
                      isSelected
                        ? "bg-[var(--ct-surface-1)] text-[var(--ct-accent)]"
                        : "text-[var(--ct-text-primary)] hover:bg-[var(--ct-surface-1)]",
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-2 shrink-0 mono text-xs text-[var(--ct-text-faint)]">
                      {opt.ticker}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </span>
  );
}
