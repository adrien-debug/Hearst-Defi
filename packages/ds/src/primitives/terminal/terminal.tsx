"use client";

/**
 * @ds/core/primitives/terminal
 *
 * Read-only log surface or interactive REPL.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ForwardedRef,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";

import { terminalVariants } from "./terminal.variants";
import type { TerminalLine, TerminalProps } from "./terminal.types";

function formatTs(ts: string | Date | undefined): string {
  if (!ts) return "";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function levelShort(level: TerminalLine["level"]): string {
  switch (level) {
    case "log":
      return "LOG";
    case "info":
      return "INF";
    case "warn":
      return "WRN";
    case "error":
      return "ERR";
    case "success":
      return "OK ";
    default:
      return "···";
  }
}

export const Terminal = forwardRef<HTMLDivElement, TerminalProps>(
  function Terminal(
    {
      lines,
      prompt = "$ ",
      interactive = false,
      onSubmit,
      monospaceFont,
      variant,
      size,
      className,
      style,
      ...rest
    }: TerminalProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = terminalVariants({ variant, size });
    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [draft, setDraft] = useState<string>("");

    /* Auto-scroll on new lines unless user has scrolled up significantly. */
    useEffect(() => {
      const el = bodyRef.current;
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance < 80) {
        el.scrollTop = el.scrollHeight;
      }
    }, [lines.length]);

    const onKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const v = draft.trim();
          if (!v) return;
          onSubmit?.(v);
          setDraft("");
        }
      },
      [draft, onSubmit],
    );

    const composedStyle = monospaceFont
      ? { ...style, fontFamily: monospaceFont }
      : style;

    return (
      <div
        ref={ref}
        role="log"
        aria-live="polite"
        aria-atomic="false"
        className={cn(styles.root(), className)}
        style={composedStyle}
        {...rest}
      >
        <div ref={composeRefs(bodyRef)} className={styles.body()}>
          {lines.map((l) => (
            <div key={l.id} data-level={l.level} className={styles.line()}>
              {l.ts ? (
                <span className={styles.ts()}>{formatTs(l.ts)}</span>
              ) : null}
              <span className={styles.levelPill()} aria-label={l.level}>
                {levelShort(l.level)}
              </span>
              <span className={styles.content()}>{l.content}</span>
            </div>
          ))}
        </div>

        {interactive ? (
          <div className={styles.inputRow()}>
            <span aria-hidden="true" className={styles.prompt()}>
              {prompt}
            </span>
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={onKeyDown}
              className={styles.input()}
              aria-label="Terminal command"
            />
          </div>
        ) : null}
      </div>
    );
  },
);

Terminal.displayName = "Terminal";
