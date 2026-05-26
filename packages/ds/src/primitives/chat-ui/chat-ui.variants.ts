import { tv, type TVVariantProps } from "../../utils/tv";

export const chatVariants = tv({
  slots: {
    root: [
      "flex flex-col w-full",
      "gap-[var(--ds-spacing-4)]",
      "overflow-y-auto",
      "scroll-pb-[var(--ds-spacing-6)]",
      "py-[var(--ds-spacing-4)]",
    ],
    message: [
      "group/msg flex gap-[var(--ds-spacing-3)]",
      "items-start",
      "px-[var(--ds-spacing-4)]",
    ],
    avatar: [
      "shrink-0 h-[var(--ds-spacing-8)] w-[var(--ds-spacing-8)]",
      "rounded-[var(--ds-radius-full)] overflow-hidden",
      "bg-[color:var(--ds-bg-muted,var(--ds-color-neutral-200))]",
      "inline-flex items-center justify-center",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "font-[var(--ds-font-weight-body-md,600)]",
    ],
    body: [
      "flex-1 min-w-0 flex flex-col gap-[var(--ds-spacing-1)]",
    ],
    meta: [
      "flex items-center gap-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    role: [
      "font-[var(--ds-font-weight-body-md,600)]",
      "text-[color:var(--ds-text-primary)]",
    ],
    content: [
      "text-[length:var(--ds-font-size-body-md)]",
      "text-[color:var(--ds-text-primary)]",
      "leading-[var(--ds-font-line-height-relaxed,1.6)]",
      "whitespace-pre-wrap break-words",
    ],
    cursor: [
      "inline-block align-baseline",
      "w-[var(--ds-spacing-0_5)] h-[1em] ml-[var(--ds-spacing-0_5)]",
      "bg-[color:var(--ds-text-primary)]",
      "animate-pulse",
      "motion-reduce:animate-none motion-reduce:opacity-100",
    ],
    actions: [
      "flex items-center gap-[var(--ds-spacing-1)]",
      "mt-[var(--ds-spacing-1)]",
      "opacity-0",
      "transition-opacity",
      "duration-[var(--ds-motion-duration-fast,150ms)]",
      "group-hover/msg:opacity-100 focus-within:opacity-100",
      "motion-reduce:transition-none",
    ],
    actionButton: [
      "inline-flex items-center justify-center gap-[var(--ds-spacing-1)]",
      "h-[var(--ds-spacing-7)] px-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-sm)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "border border-solid border-transparent",
      "cursor-pointer",
      "transition-colors",
      "hover:bg-[color:var(--ds-bg-muted,transparent)]",
      "hover:text-[color:var(--ds-text-primary)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2",
      "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      bubbles: {
        content: [
          "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2)]",
          "rounded-[var(--ds-radius-xl)]",
          "border border-solid border-[color:var(--ds-border-default)]",
          "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
        ],
      },
      minimal: {
        avatar: ["hidden"],
        meta: ["hidden"],
      },
    },
    role: {
      user: {
        message: ["flex-row-reverse"],
        body: ["items-end"],
      },
      assistant: {},
      system: {
        content: [
          "text-[length:var(--ds-font-size-body-sm)]",
          "italic",
          "text-[color:var(--ds-text-secondary)]",
        ],
      },
    },
    size: {
      sm: { content: ["text-[length:var(--ds-font-size-body-sm)]"] },
      md: {},
      lg: { content: ["text-[length:var(--ds-font-size-body-lg)]"] },
    },
  },
  defaultVariants: {
    variant: "default",
    role: "assistant",
    size: "md",
  },
});

export type ChatVariantProps = TVVariantProps<typeof chatVariants>;
