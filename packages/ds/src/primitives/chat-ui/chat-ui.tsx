"use client";

/**
 * @ds/core/primitives/chat-ui
 *
 * Composed chat scroller (`Chat`) + message row (`ChatMessage`).
 * Auto-scrolls to bottom on new content unless the user has scrolled up
 * (intelligent autoscroll — opt out via `autoScroll={false}`).
 */

import {
  Children,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ForwardedRef } from "react";

import { cn } from "../../utils/cn";
import { composeRefs } from "../../utils/compose-refs";

import { chatVariants } from "./chat-ui.variants";
import type { ChatMessageProps, ChatProps } from "./chat-ui.types";

const SCROLL_LOCK_PX = 32;

export const Chat = forwardRef<HTMLDivElement, ChatProps>(function Chat(
  { children, autoScroll = true, variant, size, className, ...rest }: ChatProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const styles = chatVariants({ variant, size });
  const localRef = useRef<HTMLDivElement>(null);
  const [stuckToBottom, setStuckToBottom] = useState<boolean>(true);

  const onScroll = useCallback(() => {
    const el = localRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setStuckToBottom(distance < SCROLL_LOCK_PX);
  }, []);

  const childCount = Children.count(children);

  useLayoutEffect(() => {
    if (!autoScroll || !stuckToBottom) return;
    const el = localRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [autoScroll, stuckToBottom, childCount]);

  return (
    <div
      ref={composeRefs(ref, localRef)}
      role="log"
      aria-live="polite"
      aria-atomic="false"
      onScroll={onScroll}
      className={cn(styles.root(), className)}
      {...rest}
    >
      {children}
    </div>
  );
});

Chat.displayName = "Chat";

function formatTime(ts: string | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function roleLabel(role: ChatMessageProps["role"]): string {
  switch (role) {
    case "user":
      return "You";
    case "assistant":
      return "Assistant";
    case "system":
      return "System";
    default:
      return "";
  }
}

function initialOf(role: ChatMessageProps["role"]): string {
  return role.charAt(0).toUpperCase();
}

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  function ChatMessage(
    {
      role,
      content,
      timestamp,
      avatar,
      actions,
      streaming = false,
      variant,
      size,
      className,
      ...rest
    }: ChatMessageProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const styles = chatVariants({ variant, role, size });
    const label = roleLabel(role);

    useEffect(() => {
      // no-op; placeholder to keep React hooks order stable across variants.
    }, []);

    return (
      <div
        ref={ref}
        data-role={role}
        data-streaming={streaming || undefined}
        className={cn(styles.message(), className)}
        {...rest}
      >
        <div className={styles.avatar()} aria-hidden="true">
          {avatar ?? initialOf(role)}
        </div>

        <div className={styles.body()}>
          <div className={styles.meta()}>
            <span className={styles.role()}>{label}</span>
            {timestamp ? <span>{formatTime(timestamp)}</span> : null}
          </div>

          <div className={styles.content()}>
            {content}
            {streaming ? <span aria-hidden="true" className={styles.cursor()} /> : null}
          </div>

          {actions && actions.length > 0 ? (
            <div className={styles.actions()} role="group" aria-label="Message actions">
              {actions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={styles.actionButton()}
                  onClick={a.onClick}
                  aria-label={a.label}
                >
                  {a.icon ?? null}
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

ChatMessage.displayName = "ChatMessage";
