"use client";

/**
 * @ds/core/primitives/command-palette
 *
 * Modal Cmd+K palette. In-house dialog (no Radix Dialog needed) with:
 * - Focus trap, Esc to close, overlay click to dismiss
 * - Keyboard nav (↑/↓ wrap, Enter execute, Home/End)
 * - Fuzzy filter on label + keywords
 * - Group rendering preserving insertion order
 * - Recent surfacing when input is empty
 *
 * See `./README.md`.
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
import { Search, X } from "lucide-react";

import { cn } from "../../utils/cn";
import { useEscapeKey, useFocusTrap } from "../../utils/a11y";
import { composeRefs } from "../../utils/compose-refs";

import { commandPaletteVariants } from "./command-palette.variants";
import type {
  CommandPaletteCommand,
  CommandPaletteProps,
} from "./command-palette.types";

/* -------------------------------------------------------------------------- */
/*  Fuzzy filter (tiny, deterministic, no deps)                                */
/* -------------------------------------------------------------------------- */

function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 1;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;
  if (h.startsWith(n)) return 500;
  if (h.includes(n)) return 250;
  // subsequence match
  let hi = 0;
  let matched = 0;
  for (let ni = 0; ni < n.length; ni += 1) {
    const c = n.charAt(ni);
    while (hi < h.length && h.charAt(hi) !== c) hi += 1;
    if (hi === h.length) return 0;
    matched += 1;
    hi += 1;
  }
  return matched === n.length ? 50 + matched : 0;
}

function scoreCommand(cmd: CommandPaletteCommand, q: string): number {
  if (!q) return 1;
  const fields = [cmd.label, cmd.description ?? "", ...(cmd.keywords ?? [])];
  let best = 0;
  for (const f of fields) {
    const s = fuzzyScore(f, q);
    if (s > best) best = s;
  }
  return best;
}

interface GroupedCommand {
  group: string;
  items: CommandPaletteCommand[];
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

export const CommandPalette = forwardRef<HTMLDivElement, CommandPaletteProps>(
  function CommandPalette(
    {
      open,
      onOpenChange,
      commands,
      placeholder = "Type a command or search…",
      emptyMessage = "No results.",
      recentIds,
      footer,
      ariaLabel = "Command palette",
      variant,
      size,
      className,
      ...rest
    }: CommandPaletteProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = commandPaletteVariants({ variant, size });
    const surfaceRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const titleId = useId();

    const [query, setQuery] = useState<string>("");
    const [activeIndex, setActiveIndex] = useState<number>(0);

    /* Reset query whenever palette re-opens. */
    useEffect(() => {
      if (open) {
        setQuery("");
        setActiveIndex(0);
        // microtask to allow input focus after animation start
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(t);
      }
      return;
    }, [open]);

    useFocusTrap(surfaceRef, open);
    useEscapeKey(() => onOpenChange(false), open);

    /* Filter + group */
    const grouped = useMemo<GroupedCommand[]>(() => {
      const q = query.trim();
      const enabled = commands.filter((c) => !c.disabled || q.length > 0);
      let working: CommandPaletteCommand[];
      if (q.length === 0 && recentIds && recentIds.length > 0) {
        const recentSet = new Set(recentIds);
        const recent = recentIds
          .map((id) => enabled.find((c) => c.id === id))
          .filter((c): c is CommandPaletteCommand => Boolean(c));
        const rest = enabled.filter((c) => !recentSet.has(c.id));
        working = [...recent, ...rest];
      } else if (q.length === 0) {
        working = enabled;
      } else {
        working = enabled
          .map((c) => ({ c, score: scoreCommand(c, q) }))
          .filter((x) => x.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((x) => x.c);
      }

      // Group preservation
      const map = new Map<string, CommandPaletteCommand[]>();
      const order: string[] = [];
      const recentSet =
        q.length === 0 && recentIds ? new Set(recentIds) : null;

      for (const c of working) {
        const g =
          recentSet && recentSet.has(c.id) ? "Recent" : c.group ?? "Commands";
        if (!map.has(g)) {
          map.set(g, []);
          order.push(g);
        }
        map.get(g)!.push(c);
      }

      return order.map((g) => ({ group: g, items: map.get(g)! }));
    }, [commands, query, recentIds]);

    /* Flat list for keyboard navigation */
    const flat = useMemo<CommandPaletteCommand[]>(
      () => grouped.flatMap((g) => g.items),
      [grouped],
    );

    useEffect(() => {
      if (activeIndex >= flat.length) {
        setActiveIndex(flat.length === 0 ? 0 : flat.length - 1);
      }
    }, [flat.length, activeIndex]);

    const execute = useCallback(
      (cmd: CommandPaletteCommand) => {
        if (cmd.disabled) return;
        onOpenChange(false);
        // Defer to next tick so consumers can rely on close-then-act ordering.
        Promise.resolve().then(() => cmd.action());
      },
      [onOpenChange],
    );

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (flat.length === 0) {
          if (e.key === "Escape") {
            e.preventDefault();
            onOpenChange(false);
          }
          return;
        }
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % flat.length);
            break;
          case "ArrowUp":
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
            break;
          case "Home":
            e.preventDefault();
            setActiveIndex(0);
            break;
          case "End":
            e.preventDefault();
            setActiveIndex(flat.length - 1);
            break;
          case "Enter": {
            e.preventDefault();
            const cmd = flat[activeIndex];
            if (cmd) execute(cmd);
            break;
          }
          default:
            break;
        }
      },
      [flat, activeIndex, execute, onOpenChange],
    );

    const onOverlayClick = useCallback(
      (e: ReactMouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      },
      [onOpenChange],
    );

    /* Scroll active into view */
    useEffect(() => {
      if (!open) return;
      const list = listRef.current;
      if (!list) return;
      const el = list.querySelector<HTMLDivElement>(
        `[data-cmd-index="${activeIndex}"]`,
      );
      if (el) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }, [activeIndex, open]);

    if (!open) return null;

    const inputId = `${titleId}-input`;
    const listboxId = `${titleId}-listbox`;

    return (
      <div
        className={styles.overlay()}
        onMouseDown={onOverlayClick}
        data-state={open ? "open" : "closed"}
        aria-hidden={!open}
      >
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
            {ariaLabel}
          </span>

          <div className={styles.inputRow()}>
            <Search
              aria-hidden="true"
              size={18}
              className={styles.inputIcon()}
            />
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                flat[activeIndex] ? `${titleId}-opt-${flat[activeIndex].id}` : undefined
              }
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setActiveIndex(0);
              }}
              placeholder={placeholder}
              className={styles.input()}
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close command palette"
              className={cn(
                styles.closeHint(),
                "hover:bg-[color:var(--ds-bg-muted,transparent)]",
                "cursor-pointer",
              )}
            >
              <X aria-hidden="true" size={12} />
              <span className="ml-[var(--ds-spacing-1)]">esc</span>
            </button>
          </div>

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel}
            className={styles.list()}
          >
            {flat.length === 0 ? (
              <div className={styles.empty()}>{emptyMessage}</div>
            ) : (
              grouped.map((g) => (
                <div key={g.group} className={styles.group()}>
                  <div className={styles.groupLabel()}>{g.group}</div>
                  {g.items.map((cmd) => {
                    const indexInFlat = flat.indexOf(cmd);
                    const active = indexInFlat === activeIndex;
                    return (
                      <div
                        key={cmd.id}
                        id={`${titleId}-opt-${cmd.id}`}
                        role="option"
                        aria-selected={active}
                        data-active={active || undefined}
                        data-disabled={cmd.disabled || undefined}
                        data-cmd-index={indexInFlat}
                        onMouseMove={() => setActiveIndex(indexInFlat)}
                        onClick={() => execute(cmd)}
                        className={styles.item()}
                      >
                        {cmd.icon ? (
                          <span className={styles.itemIcon()} aria-hidden="true">
                            {cmd.icon}
                          </span>
                        ) : null}
                        <span className={styles.itemBody()}>
                          <span className={styles.itemLabel()}>{cmd.label}</span>
                          {cmd.description ? (
                            <span className={styles.itemDescription()}>
                              {cmd.description}
                            </span>
                          ) : null}
                        </span>
                        {cmd.shortcut ? (
                          <kbd className={styles.shortcut()}>{cmd.shortcut}</kbd>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {footer ? <div className={styles.footer()}>{footer}</div> : null}
        </div>
      </div>
    );
  },
);

CommandPalette.displayName = "CommandPalette";
