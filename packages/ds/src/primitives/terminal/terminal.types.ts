import type { HTMLAttributes } from "react";

import type { TerminalVariantProps } from "./terminal.variants";

export type TerminalVariant = NonNullable<TerminalVariantProps["variant"]>;
export type TerminalSize = NonNullable<TerminalVariantProps["size"]>;
export type TerminalLevel =
  | "log"
  | "info"
  | "warn"
  | "error"
  | "success";

export interface TerminalLine {
  /** Stable id. */
  id: string;
  /** Optional timestamp (ISO or Date). Rendered as locale time. */
  ts?: string | Date;
  /** Severity colour. */
  level: TerminalLevel;
  /** Raw text (newlines preserved). */
  content: string;
}

export interface TerminalProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onSubmit">,
    TerminalVariantProps {
  lines: TerminalLine[];
  /** Prompt string when `interactive`. Defaults to `"$ "`. */
  prompt?: string;
  /** Show input row at the bottom. */
  interactive?: boolean;
  /** Called when user submits the input (Enter). */
  onSubmit?: (cmd: string) => void;
  /** Override the monospace stack — usually you should not. */
  monospaceFont?: string;
}
