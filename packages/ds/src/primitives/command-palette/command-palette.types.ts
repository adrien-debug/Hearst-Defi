import type { HTMLAttributes, ReactNode } from "react";

export type CommandPaletteVariant = "default" | "minimal";
export type CommandPaletteSize = "sm" | "md" | "lg";

export interface CommandPaletteCommand {
  /** Stable unique identifier (used for `recentIds`, keys). */
  id: string;
  /** Human-readable label shown as the primary line. */
  label: string;
  /** Optional group / section name (e.g. `"Navigation"`). */
  group?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Keyboard shortcut hint, e.g. `"⌘K"`. */
  shortcut?: string;
  /** Optional secondary description line. */
  description?: string;
  /** Synonym tokens used by the fuzzy filter. */
  keywords?: string[];
  /** Invoked when the command is selected (Enter or click). */
  action: () => void;
  /** When true, command is rendered but not selectable. */
  disabled?: boolean;
}

export interface CommandPaletteProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Visual variant. */
  variant?: CommandPaletteVariant;
  /** Surface size. */
  size?: CommandPaletteSize;
  /** Controls open state. */
  open: boolean;
  /** Called whenever the palette wants to close (Esc, overlay click, action run). */
  onOpenChange: (open: boolean) => void;
  /** Command catalog. */
  commands: CommandPaletteCommand[];
  /** Placeholder string in the search input. */
  placeholder?: string;
  /** Message shown when nothing matches the query. */
  emptyMessage?: string;
  /** IDs surfaced first as "Recent" when input is empty. */
  recentIds?: string[];
  /** Optional footer node (keyboard hints, etc.). */
  footer?: ReactNode;
  /** Stable label for AT (defaults to "Command palette"). */
  ariaLabel?: string;
}
