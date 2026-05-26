import { tv, type TVVariantProps } from "../../utils/tv";

export const fileUploadVariants = tv({
  slots: {
    root: ["flex flex-col gap-[var(--ds-spacing-3)]"],
    dropzone: [
      "relative flex flex-col items-center justify-center gap-[var(--ds-spacing-2)]",
      "px-[var(--ds-spacing-6)] py-[var(--ds-spacing-8)]",
      "rounded-[var(--ds-radius-xl)]",
      "border-2 border-dashed border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-muted,transparent)]",
      "text-center",
      "cursor-pointer",
      "transition-[border-color,background-color]",
      "duration-[var(--ds-motion-duration-fast,150ms)]",
      "motion-reduce:transition-none",
      "hover:border-[color:var(--ds-border-strong)]",
      "focus-within:border-[color:var(--ds-color-focus-ring)]",
      "data-[active=true]:border-[color:var(--ds-color-accent-500)]",
      "data-[active=true]:bg-[color:color-mix(in_oklch,var(--ds-color-accent-500)_8%,transparent)]",
      "data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-[var(--ds-opacity-disabled,0.5)]",
    ],
    icon: [
      "h-[var(--ds-spacing-10)] w-[var(--ds-spacing-10)]",
      "rounded-[var(--ds-radius-full)]",
      "bg-[color:var(--ds-bg-elevated,var(--ds-color-neutral-100))]",
      "inline-flex items-center justify-center",
      "text-[color:var(--ds-text-secondary)]",
    ],
    headline: [
      "text-[length:var(--ds-font-size-body-md)]",
      "font-[var(--ds-font-weight-body-md,600)]",
      "text-[color:var(--ds-text-primary)]",
    ],
    subline: [
      "text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-secondary)]",
    ],
    fileList: ["flex flex-col gap-[var(--ds-spacing-2)]"],
    fileItem: [
      "flex items-center gap-[var(--ds-spacing-3)]",
      "px-[var(--ds-spacing-3)] py-[var(--ds-spacing-2)]",
      "rounded-[var(--ds-radius-md)]",
      "border border-solid border-[color:var(--ds-border-default)]",
      "bg-[color:var(--ds-bg-elevated,transparent)]",
      "data-[error=true]:border-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
    ],
    thumb: [
      "h-[var(--ds-spacing-9)] w-[var(--ds-spacing-9)]",
      "rounded-[var(--ds-radius-md)] overflow-hidden",
      "bg-[color:var(--ds-bg-muted,transparent)]",
      "inline-flex items-center justify-center shrink-0",
      "text-[color:var(--ds-text-secondary)]",
    ],
    thumbImg: ["h-full w-full object-cover"],
    fileBody: ["flex-1 min-w-0 flex flex-col gap-[var(--ds-spacing-1)]"],
    fileRow: [
      "flex items-baseline justify-between gap-[var(--ds-spacing-2)]",
    ],
    fileName: [
      "truncate text-[length:var(--ds-font-size-body-sm)]",
      "text-[color:var(--ds-text-primary)]",
      "font-[var(--ds-font-weight-body-md,500)]",
    ],
    fileSize: [
      "shrink-0 text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-text-secondary)]",
      "tabular-nums",
    ],
    progressTrack: [
      "h-[var(--ds-spacing-1)] rounded-[var(--ds-radius-full)]",
      "bg-[color:var(--ds-bg-muted,transparent)]",
      "overflow-hidden",
    ],
    progressFill: [
      "h-full bg-[color:var(--ds-color-accent-500)]",
      "transition-[width]",
      "duration-[var(--ds-motion-duration-base,200ms)]",
      "motion-reduce:transition-none",
    ],
    errorText: [
      "text-[length:var(--ds-font-size-body-xs)]",
      "text-[color:var(--ds-status-danger-fg,var(--ds-color-danger-600))]",
    ],
    removeBtn: [
      "h-[var(--ds-spacing-7)] w-[var(--ds-spacing-7)]",
      "inline-flex items-center justify-center",
      "rounded-[var(--ds-radius-md)]",
      "text-[color:var(--ds-text-secondary)] cursor-pointer",
      "hover:bg-[color:var(--ds-bg-muted,transparent)]",
      "hover:text-[color:var(--ds-text-primary)]",
    ],
  },
  variants: {
    variant: {
      default: {},
      minimal: { dropzone: ["border-transparent bg-transparent"] },
    },
    size: {
      sm: { dropzone: ["py-[var(--ds-spacing-4)]"] },
      md: {},
      lg: { dropzone: ["py-[var(--ds-spacing-12)]"] },
    },
  },
  defaultVariants: { variant: "default", size: "md" },
});

export type FileUploadVariantProps = TVVariantProps<typeof fileUploadVariants>;
