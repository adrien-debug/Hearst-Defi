import { tv, type TVVariantProps } from "../../utils/tv";

export const notificationCenterVariants = tv({
  slots: {
    backdrop: [
      "fixed inset-0 z-[var(--ds-z-overlay)]",
      "bg-[color:var(--ds-color-overlay,rgba(0,0,0,0.2))]",
      "transition-opacity",
      "duration-[var(--ds-motion-duration-base,200ms)]",
      "motion-reduce:transition-none",
    ],
    panel: [
      "fixed right-0 top-0 bottom-0",
      "z-[var(--ds-z-drawer)]",
      "w-[min(420px,100vw)]",
      "flex flex-col",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
      "border-l border-solid border-[color:var(--ds-border-default)]",
      "shadow-[var(--ds-shadow-floating,0_24px_64px_-12px_rgba(0,0,0,0.25))]",
      "transition-transform",
      "duration-[var(--ds-motion-duration-base,200ms)]",
      "ease-[var(--ds-motion-ease-emphasized,cubic-bezier(0.2,0,0,1))]",
      "motion-reduce:transition-none",
      "data-[state=closed]:translate-x-full",
      "data-[state=open]:translate-x-0",
    ],
    header: [
      "flex items-center justify-between gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-4)] py-[var(--ds-spacing-3)]",
      "border-b border-solid border-[color:var(--ds-border-default)]",
    ],
    headerTitle: [
      "text-[length:var(--ds-font-size-heading-sm,1.125rem)]",
      "font-[var(--ds-font-weight-heading-md,600)]",
      "text-[color:var(--ds-text-primary)]",
    ],
    headerActions: ["flex items-center gap-[var(--ds-spacing-2)]"],
    markAllButton: [
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
      "px-[var(--ds-spacing-2)] py-[var(--ds-spacing-1)]",
      "rounded-[var(--ds-radius-sm)]",
      "cursor-pointer",
      "hover:bg-[color:var(--ds-bg-muted,transparent)]",
      "hover:text-[color:var(--ds-text-primary)]",
    ],
    closeBtn: [
      "h-[var(--ds-spacing-8)] w-[var(--ds-spacing-8)]",
      "inline-flex items-center justify-center",
      "rounded-[var(--ds-radius-md)]",
      "text-[color:var(--ds-text-secondary)]",
      "cursor-pointer",
      "hover:bg-[color:var(--ds-bg-muted,transparent)]",
      "hover:text-[color:var(--ds-text-primary)]",
    ],
    list: ["flex-1 overflow-y-auto"],
    groupLabel: [
      "px-[var(--ds-spacing-4)] py-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "uppercase tracking-[var(--ds-letter-spacing-wide,0.06em)]",
      "text-[color:var(--ds-text-secondary)]",
      "font-[var(--ds-font-weight-body-md,600)]",
      "border-y border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-muted,transparent)]",
    ],
    item: [
      "group/notif flex gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-4)] py-[var(--ds-spacing-3)]",
      "border-b border-solid border-[color:var(--ds-border-default)]",
      "cursor-pointer",
      "transition-colors",
      "hover:bg-[color:var(--ds-bg-muted,transparent)]",
      "focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
      "focus-visible:outline-[color:var(--ds-color-focus-ring)]",
    ],
    severityDot: [
      "shrink-0 mt-[var(--ds-spacing-1_5)]",
      "h-[var(--ds-spacing-2)] w-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-full)]",
      "data-[sev=info]:bg-[color:var(--ds-status-info-fg,var(--ds-color-info-500))]",
      "data-[sev=success]:bg-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
      "data-[sev=warning]:bg-[color:var(--ds-status-warning-fg,var(--ds-color-warning-600))]",
      "data-[sev=danger]:bg-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
    ],
    itemBody: ["flex-1 min-w-0 flex flex-col gap-[var(--ds-spacing-1)]"],
    itemTitleRow: [
      "flex items-baseline justify-between gap-[var(--ds-spacing-2)]",
    ],
    itemTitle: [
      "text-[length:var(--ds-font-size-body-md)]",
      "font-[var(--ds-font-weight-body-md,600)]",
      "text-[color:var(--ds-text-primary)]",
      "truncate",
    ],
    itemTime: [
      "shrink-0 text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "tabular-nums",
    ],
    itemBodyText: [
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
      "line-clamp-2",
    ],
    itemAction: [
      "inline-flex self-start",
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-accent,var(--ds-color-accent-700))]",
      "underline underline-offset-[3px] decoration-[1px]",
      "cursor-pointer",
      "hover:decoration-[2px]",
    ],
    unreadBadge: [
      "ml-[var(--ds-spacing-1)]",
      "inline-block h-[var(--ds-spacing-2)] w-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-full)]",
      "bg-[color:var(--ds-color-accent-500)]",
    ],
    empty: [
      "flex flex-col items-center justify-center gap-[var(--ds-spacing-2)]",
      "p-[var(--ds-spacing-12)]",
      "text-[color:var(--ds-text-secondary)]",
      "text-center",
    ],
    emptyTitle: [
      "text-[length:var(--ds-font-size-body-md)]",
      "font-[var(--ds-font-weight-body-md,600)]",
      "text-[color:var(--ds-text-primary)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      glass: {
        panel: [
          "bg-[color:color-mix(in_oklch,var(--ds-bg-elevated)_70%,transparent)]",
          "backdrop-blur-[var(--ds-blur-md,12px)]",
        ],
      },
    },
    size: {
      sm: { panel: ["w-[min(320px,100vw)]"] },
      md: {},
      lg: { panel: ["w-[min(520px,100vw)]"] },
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export type NotificationCenterVariantProps = TVVariantProps<
  typeof notificationCenterVariants
>;
