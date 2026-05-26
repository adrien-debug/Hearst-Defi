import { tv, type TVVariantProps } from "../../utils/tv";

export const terminalVariants = tv({
  slots: {
    root: [
      "flex flex-col w-full",
      "rounded-[var(--ds-radius-lg)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-950))]",
      "text-[color:var(--ds-text-primary)]",
      "font-[family-name:var(--ds-font-family-mono)]",
      "overflow-hidden",
    ],
    body: [
      "flex-1 overflow-y-auto",
      "p-[var(--ds-spacing-3)]",
      "text-[length:var(--ds-font-size-body-sm)]",
      "leading-[var(--ds-font-line-height-relaxed,1.5)]",
    ],
    line: [
      "flex items-baseline gap-[var(--ds-spacing-2)]",
      "whitespace-pre-wrap break-words",
      "data-[level=warn]:text-[color:var(--ds-status-warning-fg,var(--ds-color-warning-600))]",
      "data-[level=error]:text-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
      "data-[level=success]:text-[color:var(--ds-status-success-fg,var(--ds-color-success-600))]",
      "data-[level=info]:text-[color:var(--ds-status-info-fg,var(--ds-color-info-500))]",
    ],
    ts: [
      "shrink-0",
      "text-[color:var(--ds-text-secondary)]",
      "tabular-nums",
    ],
    levelPill: [
      "shrink-0 uppercase",
      "text-[length:var(--ds-font-size-body-xs)]",
      "px-[var(--ds-spacing-1)]",
      "rounded-[var(--ds-radius-xs)]",
      "border border-solid border-current",
    ],
    content: ["flex-1"],
    inputRow: [
      "flex items-center gap-[var(--ds-spacing-2)]",
      "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2)]",
      "border-t border-solid border-[color:var(--ds-border-default)]",
    ],
    prompt: ["shrink-0 text-[color:var(--ds-color-accent-500)]"],
    input: [
      "flex-1 bg-transparent outline-none",
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-primary)]",
      "placeholder:text-[color:var(--ds-text-secondary)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      minimal: {
        root: ["border-transparent bg-transparent"],
      },
      glass: {
        root: [
          "bg-[color:color-mix(in_oklch,var(--ds-color-neutral-950)_85%,transparent)]",
          "backdrop-blur-[var(--ds-blur-md,8px)]",
        ],
      },
    },
    size: {
      sm: { body: ["text-[length:var(--ds-font-size-body-xs)]"] },
      md: {},
      lg: { body: ["text-[length:var(--ds-font-size-body-md)]"] },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export type TerminalVariantProps = TVVariantProps<typeof terminalVariants>;
