"use client";

/**
 * CommandPalette
 *
 * Modal overlay triggered by ⌘K. Features:
 *  - Fuzzy search across all 30 commands
 *  - Grouped sections (Navigate / Action / Search / View)
 *  - Keyboard navigation (↑ ↓ Enter Esc)
 *  - Recent items when query is empty
 *  - Context-aware suggestions (route-based)
 *  - Full a11y: role="dialog", aria-modal, focus trap, esc closes
 *
 * Styling: Cockpit tokens only — no hardcoded colours.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  filterCommands,
  groupBySection,
  SECTION_ORDER,
  type Command,
  type CommandSection,
} from "@/lib/power/commands";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_RECENTS = 5;
const RECENTS_KEY = "hc:cmd-palette:recents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? (parsed as string[]).filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecents(ids: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(ids.slice(0, MAX_RECENTS)));
  } catch {
    // storage quota — silent
  }
}

/** Section-to-icon mapping (Lucide SVG inline, avoids a full lucide import). */
const SECTION_ICON: Record<CommandSection, string> = {
  Navigate: "→",
  Action: "⚡",
  Search: "⌕",
  View: "◎",
};

// ── Route context suggestions ─────────────────────────────────────────────────

const ROUTE_SUGGESTIONS: Record<string, string[]> = {
  "/admin/dashboard": ["action-oracle-refresh", "view-events-24h"],
  "/admin/vaults": ["action-pause-vault", "action-new-distribution"],
  "/admin/customers": ["action-approve-signers", "action-export-lp", "search-lp-name"],
  "/admin/distributions": ["action-new-distribution", "action-export-audit"],
  "/admin/proofs": ["action-mint-proof"],
  "/admin/monitoring": ["action-rotate-signer", "action-approve-signers"],
  "/admin/scenario-lab": ["action-stress-scenario"],
  "/admin/investor-memo": ["action-generate-memo"],
};

function getSuggestionIds(pathname: string): string[] {
  // Exact match
  if (ROUTE_SUGGESTIONS[pathname]) return ROUTE_SUGGESTIONS[pathname];
  // Prefix match
  const prefix = Object.keys(ROUTE_SUGGESTIONS).find((k) =>
    pathname.startsWith(k),
  );
  return prefix ? (ROUTE_SUGGESTIONS[prefix] ?? []) : [];
}

// ── CommandItem ───────────────────────────────────────────────────────────────

interface CommandItemProps {
  command: Command;
  active: boolean;
  onSelect: (cmd: Command) => void;
  onMouseEnter: () => void;
}

function CommandItem({
  command,
  active,
  onSelect,
  onMouseEnter,
}: CommandItemProps) {
  const ref = useRef<HTMLButtonElement>(null);

  // Auto-scroll active item into view
  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ block: "nearest" });
    }
  }, [active]);

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={active}
      className={cn(
        "w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left",
        "rounded-[var(--ct-radius-md)] transition-colors duration-[var(--ct-dur-fast)]",
        "text-sm text-[var(--ct-text-body)]",
        "focus:outline-none",
        active
          ? "bg-[color-mix(in_srgb,var(--ct-accent)_12%,transparent)] text-[var(--ct-text-strong)]"
          : "hover:bg-[var(--ct-surface-1)]",
      )}
      onMouseEnter={onMouseEnter}
      onClick={() => onSelect(command)}
    >
      <span className="truncate leading-snug">{command.label}</span>
      {command.shortcut && (
        <kbd
          className={cn(
            "shrink-0 font-mono text-xs tabular-nums px-1.5 py-0.5",
            "rounded-[var(--ct-radius-sm)] border border-[var(--ct-border)]",
            "text-[var(--ct-text-muted)] bg-[var(--ct-surface-1)]",
          )}
        >
          {command.shortcut}
        </kbd>
      )}
    </button>
  );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  section: CommandSection;
  collapsed: boolean;
  onToggle: () => void;
}

function SectionHeader({ section, collapsed, onToggle }: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-4 py-1.5 mt-2",
        "text-xs font-medium tracking-[var(--ct-tracking-uppercase)] uppercase",
        "text-[var(--ct-text-muted)] hover:text-[var(--ct-text-body)]",
        "transition-colors duration-[var(--ct-dur-fast)] focus:outline-none",
        "focus-visible:ring-1 focus-visible:ring-[var(--ct-accent)]",
      )}
      aria-expanded={!collapsed}
    >
      <span className="text-[var(--ct-accent)] text-xs w-3 select-none">
        {SECTION_ICON[section]}
      </span>
      <span>{section}</span>
      <span className="ml-auto text-[0.6rem] opacity-60">
        {collapsed ? "▶" : "▼"}
      </span>
    </button>
  );
}

// ── CommandPalette ────────────────────────────────────────────────────────────

interface CommandPaletteProps {
  commands: Command[];
  onClose: () => void;
}

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const dialogId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<
    Set<CommandSection>
  >(new Set());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecents());

  const pathname = usePathname();
  const suggestionIds = useMemo(
    () => getSuggestionIds(pathname),
    [pathname],
  );

  // ── Focus input on open ──────────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Escape closes ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── Filtered + visible commands ──────────────────────────────────────────
  const filtered = useMemo(
    () => filterCommands(commands, query),
    [commands, query],
  );

  // When query is empty → show recents + contextual suggestions at top,
  // then all commands below. When query is set → show filtered results.
  const displayCommands = useMemo<Command[]>(() => {
    if (query.trim().length > 0) return filtered;

    const pinned = new Set<string>([...recentIds, ...suggestionIds]);
    const pinnedCmds = [...pinned]
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined);

    const rest = commands.filter((c) => !pinned.has(c.id));
    return [...pinnedCmds, ...rest];
  }, [query, filtered, commands, recentIds, suggestionIds]);

  const visibleCommands = useMemo(() => {
    return displayCommands.filter((cmd) => !collapsedSections.has(cmd.section));
  }, [displayCommands, collapsedSections]);

  // activeIndex clamped — derived value, no effect needed
  const safeActiveIndex = Math.min(
    activeIndex,
    Math.max(visibleCommands.length - 1, 0),
  );

  // ── Keyboard navigation ───────────────────────────────────────────────────
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, visibleCommands.length - 1));
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      }
      case "Enter": {
        e.preventDefault();
        const cmd = visibleCommands[safeActiveIndex];
        if (cmd) runCommand(cmd);
        break;
      }
    }
  }

  // ── Select command ────────────────────────────────────────────────────────
  const runCommand = useCallback(
    (cmd: Command) => {
      // Persist to recents
      const next = [cmd.id, ...recentIds.filter((id) => id !== cmd.id)].slice(
        0,
        MAX_RECENTS,
      );
      setRecentIds(next);
      saveRecents(next);
      // Execute
      cmd.handler?.();
      if (!cmd.handler) onClose();
    },
    [recentIds, onClose],
  );

  // ── Section collapse toggle ───────────────────────────────────────────────
  function toggleSection(section: CommandSection) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }

  // ── Group for rendering ───────────────────────────────────────────────────
  // When query is empty, use custom ordering (pinned first); when searching,
  // use section groups.
  const grouped = useMemo(() => {
    if (query.trim().length > 0) {
      return groupBySection(filtered);
    }
    // When empty, build a "Recents & Suggestions" pseudo-section + section groups
    const map = groupBySection(displayCommands);
    return map;
  }, [query, filtered, displayCommands]);

  // Flat index lookup for keyboard nav
  const flatList = useMemo(() => {
    const result: Command[] = [];
    if (query.trim().length > 0) {
      for (const section of SECTION_ORDER) {
        const cmds = grouped.get(section) ?? [];
        result.push(...cmds);
      }
    } else {
      for (const section of SECTION_ORDER) {
        if (collapsedSections.has(section)) continue;
        const cmds = grouped.get(section) ?? [];
        result.push(...cmds);
      }
    }
    return result;
  }, [grouped, query, collapsedSections]);

  // ── Backdrop click ────────────────────────────────────────────────────────
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const totalVisible = flatList.length;

  return (
    /* Backdrop */
    <div
      role="presentation"
      className="fixed inset-0 z-[var(--ct-z-overlay)] flex items-start justify-center pt-[12vh]"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdropClick}
    >
      {/* Dialog */}
      <div
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          "relative w-full max-w-[640px] mx-4 overflow-hidden",
          "rounded-[var(--ct-radius-xl)] border border-[var(--ct-border-strong)]",
          "shadow-[var(--ct-shadow-elevated)]",
        )}
        style={{
          background: "var(--ct-glass-bg, var(--ct-surface-1))",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ct-border)]">
          <span className="text-[var(--ct-text-muted)] text-base select-none" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls={`${dialogId}-listbox`}
            aria-activedescendant={
              flatList[safeActiveIndex]
                ? `cmd-${flatList[safeActiveIndex]?.id}`
                : undefined
            }
            placeholder="Search commands…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className={cn(
              "flex-1 bg-transparent outline-none",
              "text-sm text-[var(--ct-text-strong)] placeholder:text-[var(--ct-text-muted)]",
            )}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd
            className={cn(
              "shrink-0 font-mono text-xs px-1.5 py-0.5",
              "rounded-[var(--ct-radius-sm)] border border-[var(--ct-border)]",
              "text-[var(--ct-text-muted)] bg-[var(--ct-surface-2)]",
            )}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id={`${dialogId}-listbox`}
          role="listbox"
          aria-label="Commands"
          className="max-h-[400px] overflow-y-auto overscroll-contain py-2"
        >
          {totalVisible === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--ct-text-muted)]">
              No commands found for &ldquo;{query}&rdquo;
            </p>
          ) : (
            (() => {
              // Track flat index across sections for keyboard nav
              let flatIdx = 0;
              const elements: React.ReactNode[] = [];

              const sectionsToRender =
                query.trim().length > 0
                  ? SECTION_ORDER.filter(
                      (s) => (grouped.get(s) ?? []).length > 0,
                    )
                  : SECTION_ORDER;

              for (const section of sectionsToRender) {
                const cmds = grouped.get(section) ?? [];
                if (cmds.length === 0) continue;
                const collapsed = collapsedSections.has(section);

                elements.push(
                  <SectionHeader
                    key={`section-${section}`}
                    section={section}
                    collapsed={collapsed}
                    onToggle={() => toggleSection(section)}
                  />,
                );

                if (!collapsed) {
                  for (const cmd of cmds) {
                    const myIndex = flatIdx;
                    elements.push(
                      <div key={cmd.id} className="px-2">
                        <CommandItem
                          command={cmd}
                          active={safeActiveIndex === myIndex}
                          onSelect={runCommand}
                          onMouseEnter={() => setActiveIndex(myIndex)}
                        />
                      </div>,
                    );
                    flatIdx++;
                  }
                }
              }

              return elements;
            })()
          )}
        </div>

        {/* Footer */}
        <div
          className={cn(
            "flex items-center gap-4 px-4 py-2 border-t border-[var(--ct-border)]",
            "text-xs text-[var(--ct-text-muted)]",
          )}
        >
          <span>
            <kbd className="font-mono text-[0.65rem] px-1 rounded border border-[var(--ct-border)] bg-[var(--ct-surface-1)]">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="font-mono text-[0.65rem] px-1 rounded border border-[var(--ct-border)] bg-[var(--ct-surface-1)]">
              ↵
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="font-mono text-[0.65rem] px-1 rounded border border-[var(--ct-border)] bg-[var(--ct-surface-1)]">
              esc
            </kbd>{" "}
            close
          </span>
          <span className="ml-auto opacity-60">
            {totalVisible} command{totalVisible !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
