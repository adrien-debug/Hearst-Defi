import type { HTMLAttributes, ReactNode } from "react";

import type { ChatVariantProps } from "./chat-ui.variants";

export type ChatVariant = NonNullable<ChatVariantProps["variant"]>;
export type ChatSize = NonNullable<ChatVariantProps["size"]>;

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessageAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
}

export interface ChatProps
  extends HTMLAttributes<HTMLDivElement>,
    ChatVariantProps {
  /** Render children inside an auto-scrolling viewport. */
  children?: ReactNode;
  /** When true (default), scrolls to bottom on new content unless user scrolled up. */
  autoScroll?: boolean;
}

export interface ChatMessageProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "role" | "content">,
    ChatVariantProps {
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
