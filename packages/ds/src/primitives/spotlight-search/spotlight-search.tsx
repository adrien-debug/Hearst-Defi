"use client";

/**
 * @ds/core/primitives/spotlight-search
 *
 * Async global search palette. Distinct from CommandPalette: this one searches
 * content (entities), grouped by section, returned asynchronously.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ForwardedRef,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { Loader2, Search } from "lucide-react";

import { cn } from "../../utils/cn";
import { useEscapeKey, useFocusTrap } from "../../utils/a11y";
import { composeRefs } from "../../utils/compose-refs";

import { spotlightSearchVariants } from "./spotlight-search.variants";
import type {
  SpotlightItem,
  SpotlightSearchProps,
  SpotlightSection,
} from "./spotlight-search.types";

const DEBOUNCE_MS = 180;

export const SpotlightSearch = forwardRef<HTMLDivElement, SpotlightSearchProps>(
  function SpotlightSearch(
    {
      open,
      onOpenChange,
      onQuery,
      onSelect,
      placeholder = "Search vaults, investors, distributions…",
      recentIds: _recentIds,
      emptyMessage = "No results.",
      variant,
      size,
      className,
      ...rest
    }: SpotlightSearchProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = spotlightSearchVariants({ variant, size });
    const surfaceRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const titleId = useId();

    const [query, setQuery] = useState<string>("");
    const [sections, setSections] = useState<SpotlightSection[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const requestSeq = useRef<number>(0);

    useFocusTrap(surfaceRef, open);
    useEscapeKey(() => onOpenChange(false), open);

    /* Reset on open */
    useEffect(() => {
      if (open) {
        setQuery("");
        setSections([]);
        setActiveIndex(0);
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(t);
      }
      return;
    }, [open]);

    /* Debounced query */
    useEffect(() => {
      if (!open) return;
      const handle = setTimeout(() => {
        const seq = ++requestSeq.current;
        setLoading(true);
        onQuery(query)
          .then((next) => {
            if (seq !== requestSeq.current) return;
            setSections(next);
            setActiveIndex(0);
          })
          .catch(() => {
            if (seq !== requestSeq.current) return;
            setSections([]);
          })
          .finally(() => {
            if (seq === requestSeq.current) setLoading(false);
          });
      }, DEBOUNCE_MS);
      return () => clearTimeout(handle);
    }, [query, open, onQuery]);

    const flat = useMemo<SpotlightItem[]>(
      () => sections.flatMap((s) => s.items),
      [sections],
    );

    const handleSelect = useCallback(
      (item: SpotlightItem) => {
        onOpenChange(false);
        if (onSelect) {
          Promise.resolve().then(() => onSelect(item));
        } else if (item.href && typeof window !== "undefined") {
          window.location.assign(item.href);
        }
      },
      [onOpenChange, onSelect],
    );

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (flat.length === 0) return;
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % flat.length);
            break;
          case "ArrowUp":
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
            break;
          case "Enter": {
            e.preventDefault();
            const it = flat[activeIndex];
            if (it) handleSelect(it);
            break;
          }
          default:
            break;
        }
      },
      [flat, activeIndex, handleSelect],
    );

    const onOverlayClick = useCallback(
      (e: ReactMouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      },
      [onOpenChange],
    );

    if (!open) return null;

    const listboxId = `${titleId}-listbox`;

    return (
      <div className={styles.overlay()} onMouseDown={onOverlayClick}>
        <div
          ref={composeRefs(ref, surfaceRef)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(styles.surface(), className)}
          onKeyDown={onKeyDown}
          {...rest}
        >
          <span id={titleId} className="sr-only">
            Search
          </span>
          <div className={styles.inputRow()}>
            <Search aria-hidden="true" size={18} className={styles.icon()} />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              placeholder={placeholder}
              className={styles.input()}
            />
          </div>

          <div id={listboxId} role="listbox" className={styles.list()}>
            {loading ? (
              <div className={styles.loading()}>
                <Loader2
                  aria-hidden="true"
                  size={16}
                  className="animate-spin motion-reduce:animate-none"
                />
                Searching…
              </div>
            ) : flat.length === 0 ? (
              <div className={styles.empty()}>{emptyMessage}</div>
            ) : (
              sections.map((s) => (
                <div key={s.section} className={styles.section()}>
                  <div className={styles.sectionLabel()}>{s.section}</div>
                  {s.items.map((it) => {
                    const idx = flat.indexOf(it);
                    const active = idx === activeIndex;
                    return (
                      <div
                        key={it.id}
                        role="option"
                        aria-selected={active}
                        data-active={active || undefined}
                        onMouseMove={() => setActiveIndex(idx)}
                        onClick={() => handleSelect(it)}
                        className={styles.item()}
                      >
                        {it.icon ? (
                          <span aria-hidden="true" className={styles.itemIcon()}>
                            {it.icon}
                          </span>
                        ) : null}
                        <div className={styles.itemBody()}>
                          <span className={styles.itemLabel()}>{it.label}</span>
                          {it.description ? (
                            <span className={styles.itemDescription()}>
                              {it.description}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className={styles.footer()}>
            <span className={styles.hint()}>
              <kbd className={styles.kbd()}>↑↓</kbd> navigate
            </span>
            <span className={styles.hint()}>
              <kbd className={styles.kbd()}>↵</kbd> select
            </span>
            <span className={styles.hint()}>
              <kbd className={styles.kbd()}>esc</kbd> close
            </span>
          </div>
        </div>
      </div>
    );
  },
);

SpotlightSearch.displayName = "SpotlightSearch";
