import type { HTMLAttributes, ReactNode } from "react";

export type ChatVariant = "default" | "bubbles" | "minimal";
export type ChatSize = "sm" | "md" | "lg";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

export interface ChatProps extends HTMLAttributes<HTMLDivElement> {
  variant?: ChatVariant;
  size?: ChatSize;
  /** Render children inside an auto-scrolling viewport. */
  children?: ReactNode;
  /** When true (default), scrolls to bottom on new content unless user scrolled up. */
  autoScroll?: boolean;
}

export interface ChatMessageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "content"> {
  variant?: ChatVariant;
  size?: ChatSize;
  role: ChatRole;
  content: ReactNode;
  /** ISO string or Date — rendered as locale time tooltip. */
  timestamp?: string | Date;
  /** Avatar node (left for assistant, right for user). */
  avatar?: ReactNode;
  /** Inline actions revealed on hover (copy, edit, retry, like, dislike). */
  actions?: ChatMessageAction[];
  /** When true, renders a blinking cursor at the end of content. */
  streaming?: boolean;
}
