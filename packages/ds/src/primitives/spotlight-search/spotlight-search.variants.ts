import { tv, type TVVariantProps } from "../../utils/tv";

export const spotlightSearchVariants = tv({
  slots: {
    overlay: [
      "fixed inset-0 z-[var(--ds-z-modal-backdrop)]",
      "bg-[color:var(--ds-color-overlay,rgba(0,0,0,0.4))]",
      "backdrop-blur-[var(--ds-blur-md,8px)]",
    ],
    surface: [
      "fixed left-1/2 top-[10vh] -translate-x-1/2",
      "z-[var(--ds-z-spotlight)]",
      "flex flex-col",
      "w-[min(720px,calc(100vw-var(--ds-spacing-8)))]",
      "max-h-[80vh]",
      "rounded-[var(--ds-radius-2xl)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
      "shadow-[var(--ds-shadow-floating,0_24px_64px_-12px_rgba(0,0,0,0.25))]",
      "outline-none overflow-hidden",
    ],
    inputRow: [
      "flex items-center gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-5)]",
      "h-[var(--ds-spacing-14)]",
      "border-b border-solid border-[color:var(--ds-border-default)]",
    ],
    input: [
      "flex-1 bg-transparent outline-none",
      "text-[length:var(--ds-font-size-heading-sm,1.125rem)]",
      "text-[color:var(--ds-text-primary)]",
      "placeholder:text-[color:var(--ds-text-placeholder,var(--ds-text-secondary))]",
      "font-[family-name:var(--ds-font-family-sans)]",
    ],
    icon: ["text-[color:var(--ds-text-secondary)] shrink-0"],
    list: ["flex-1 overflow-y-auto"],
    section: ["py-[var(--ds-spacing-2)]"],
    sectionLabel: [
      "px-[var(--ds-spacing-5)] py-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "uppercase tracking-[var(--ds-letter-spacing-wide,0.06em)]",
      "text-[color:var(--ds-text-secondary)]",
      "font-[var(--ds-font-weight-body-md,600)]",
    ],
    item: [
      "flex items-center gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-5)] py-[var(--ds-spacing-2_5)]",
      "cursor-pointer",
      "transition-colors",
      "data-[active=true]:bg-[color:var(--ds-bg-muted,var(--ds-color-neutral-100))]",
      "hover:bg-[color:var(--ds-bg-muted,var(--ds-color-neutral-100))]",
    ],
    itemIcon: ["shrink-0 text-[color:var(--ds-text-secondary)]"],
    itemBody: ["flex-1 min-w-0 flex flex-col"],
    itemLabel: [
      "truncate text-[length:var(--ds-font-size-body-md)]",
      "text-[color:var(--ds-text-primary)]",
    ],
    itemDescription: [
      "truncate text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    footer: [
      "shrink-0 flex items-center justify-between gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-5)] py-[var(--ds-spacing-2_5)]",
      "border-t border-solid border-[color:var(--ds-border-default)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    hint: ["inline-flex items-center gap-[var(--ds-spacing-2)]"],
    kbd: [
      "inline-flex items-center justify-center",
      "px-[var(--ds-spacing-1_5)] py-[var(--ds-spacing-0_5)]",
      "rounded-[var(--ds-radius-sm)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "font-[family-name:var(--ds-font-family-mono)]",
    ],
    empty: [
      "flex items-center justify-center",
      "px-[var(--ds-spacing-5)] py-[var(--ds-spacing-10)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    loading: [
      "flex items-center justify-center gap-[var(--ds-spacing-2)]",
      "px-[var(--ds-spacing-5)] py-[var(--ds-spacing-6)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      compact: { surface: ["w-[min(560px,calc(100vw-var(--ds-spacing-8)))]"] },
    },
    size: {
      sm: { surface: ["max-h-[60vh]"] },
      md: {},
      lg: { surface: ["max-h-[90vh]"] },
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export type SpotlightSearchVariantProps = TVVariantProps<
  typeof spotlightSearchVariants
>;
