import { tv } from "@ds/utils/tv";

import type { TimelineItemTone } from "./timeline.types";

export const timelineVariants = tv({
  base: "ds-flex ds-flex-col",
  variants: {
    variant: {
      default: "ds-gap-[var(--ds-spacing-4)]",
      compact: "ds-gap-[var(--ds-spacing-2)]",
      rich: "ds-gap-[var(--ds-spacing-6)]",
    },
  },
  defaultVariants: { variant: "default" },
});

export const TONE_TO_FG: Record<TimelineItemTone, string> = {
  default: "var(--ds-text-muted)",
  success: "var(--ds-status-success-fg)",
  warning: "var(--ds-status-warning-fg)",
  danger: "var(--ds-status-danger-fg)",
  info: "var(--ds-status-info-fg)",
};

export const TONE_TO_BG: Record<TimelineItemTone, string> = {
  default: "var(--ds-surface-overlay)",
  success: "var(--ds-status-success-bg)",
  warning: "var(--ds-status-warning-bg)",
  danger: "var(--ds-status-danger-bg)",
  info: "var(--ds-status-info-bg)",
};
