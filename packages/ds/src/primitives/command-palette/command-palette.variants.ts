/**
 * @ds/core/primitives/command-palette · variants
 *
 * Token-only Cmd+K palette surface.
 */

import { tv, type TVVariantProps } from "../../utils/tv";

export const commandPaletteVariants = tv({
  slots: {
    overlay: [
      "fixed inset-0",
      "z-[var(--ds-z-modal-backdrop)]",
      "bg-[color:var(--ds-color-overlay,rgba(0,0,0,0.5))]",
      "backdrop-blur-[var(--ds-blur-md,8px)]",
      "transition-opacity",
      "duration-[var(--ds-motion-duration-fast,150ms)]",
      "motion-reduce:transition-none",
    ],
    surface: [
      "fixed left-1/2 top-[15vh] -translate-x-1/2",
      "z-[var(--ds-z-command-palette)]",
      "flex flex-col",
      "w-[min(640px,calc(100vw-var(--ds-spacing-8)))]",
      "max-h-[min(70vh,640px)]",
      "rounded-[var(--ds-radius-xl)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-50))]",
      "shadow-[var(--ds-shadow-floating,0_24px_64px_-12px_rgba(0,0,0,0.25))]",
      "outline-none",
      "transition-[opacity,transform]",
      "duration-[var(--ds-motion-duration-base,200ms)]",
      "ease-[var(--ds-motion-ease-emphasized,cubic-bezier(0.2,0,0,1))]",
      "motion-reduce:transition-none",
    ],
    inputRow: [
      "flex items-center gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-4)]",
      "h-[var(--ds-spacing-12)]",
      "border-b border-solid border-[color:var(--ds-border-default)]",
    ],
    inputIcon: ["text-[color:var(--ds-text-secondary)] shrink-0"],
    input: [
      "flex-1 bg-transparent outline-none",
      "text-[length:var(--ds-font-size-body-md)]",
      "text-[color:var(--ds-text-primary)]",
      "placeholder:text-[color:var(--ds-text-placeholder,var(--ds-text-secondary))]",
      "font-[family-name:var(--ds-font-family-sans)]",
    ],
    closeHint: [
      "shrink-0 inline-flex items-center justify-center",
      "h-[var(--ds-spacing-6)] px-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-sm)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "font-[family-name:var(--ds-font-family-mono)]",
    ],
    list: [
      "flex-1 overflow-y-auto",
      "py-[var(--ds-spacing-2)]",
      "scroll-pt-[var(--ds-spacing-2)]",
    ],
    group: ["px-[var(--ds-spacing-2)]"],
    groupLabel: [
      "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2)]",
      "text-[length:var(--ds-font-size-caption,0.75rem)]",
      "text-[color:var(--ds-text-secondary)]",
      "uppercase tracking-[var(--ds-letter-spacing-wide,0.06em)]",
      "font-[var(--ds-font-weight-body-md,600)]",
    ],
    item: [
      "group/cmd flex items-center gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2_5)]",
      "rounded-[var(--ds-radius-md)]",
      "cursor-pointer select-none",
      "text-[color:var(--ds-text-primary)]",
      "text-[length:var(--ds-font-size-body-md)]",
      "transition-colors",
      "duration-[var(--ds-motion-duration-fast,150ms)]",
      "motion-reduce:transition-none",
      "data-[active=true]:bg-[color:var(--ds-bg-muted,var(--ds-color-neutral-100))]",
      "data-[disabled=true]:opacity-[var(--ds-opacity-disabled,0.5)]",
      "data-[disabled=true]:cursor-not-allowed",
      "hover:not-data-[disabled=true]:bg-[color:var(--ds-bg-muted,var(--ds-color-neutral-100))]",
    ],
    itemIcon: ["shrink-0 text-[color:var(--ds-text-secondary)]"],
    itemBody: ["flex-1 min-w-0 flex flex-col"],
    itemLabel: ["truncate"],
    itemDescription: [
      "truncate",
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    shortcut: [
      "shrink-0 inline-flex items-center gap-[var(--ds-spacing-1)]",
      "px-[var(--ds-spacing-1_5)] py-[var(--ds-spacing-0_5)]",
      "rounded-[var(--ds-radius-sm)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-muted,transparent)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "font-[family-name:var(--ds-font-family-mono)]",
    ],
    empty: [
      "flex items-center justify-center",
      "px-[var(--ds-spacing-4)] py-[var(--ds-spacing-8)]",
      "text-[color:var(--ds-text-secondary)]",
      "text-[length:var(--ds-font-size-body-sm)]",
    ],
    footer: [
      "shrink-0",
      "px-[var(--ds-spacing-4)] py-[var(--ds-spacing-2_5)]",
      "border-t border-solid border-[color:var(--ds-border-default)]",
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      minimal: {
        surface: ["border-transparent"],
      },
    },
    size: {
      sm: { surface: ["w-[min(480px,calc(100vw-var(--ds-spacing-8)))]"] },
      md: {},
      lg: { surface: ["w-[min(800px,calc(100vw-var(--ds-spacing-8)))]"] },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export type CommandPaletteVariantProps = TVVariantProps<
  typeof commandPaletteVariants
>;
